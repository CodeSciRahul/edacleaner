import { app } from 'electron'
import type {
  CleanupCategoryId,
  CleanupCategorySummary,
  CleanupExecuteOptions,
  CleanupProgressEvent,
  CleanupResult,
  CleanupScanResult,
  CleanupStepResult
} from '@shared/interfaces'
import { createLogger } from '@main/utils/logger'
import { createPlatformBoostAdapter } from '@main/services/boost/platforms/create-adapter'
import { cleanupModules, getCleanupModule } from './modules'
import type { CleanupModuleContext, CleanupProgressEmitter } from './modules/types'

const log = createLogger('CleanupService')

const VALID_CATEGORY_IDS = new Set<CleanupCategoryId>(
  cleanupModules.map((m) => m.id)
)

export type CleanupProgressListener = (event: CleanupProgressEvent) => void

export class CleanupService {
  private readonly adapter = createPlatformBoostAdapter()
  private executeAbort: AbortController | null = null
  private scanAbort: AbortController | null = null
  private executing = false
  private scanning = false

  isRunning(): boolean {
    return this.executing || this.scanning
  }

  cancel(): { cancelled: boolean } {
    let cancelled = false
    if (this.executing && this.executeAbort) {
      this.executeAbort.abort()
      cancelled = true
      log.info('Cleanup execute cancelled by user')
    }
    if (this.scanning && this.scanAbort) {
      this.scanAbort.abort()
      cancelled = true
      log.info('Cleanup scan cancelled by user')
    }
    return { cancelled }
  }

  /**
   * Scans all registered cleanup modules and returns reclaimable estimates.
   */
  async scan(onProgress?: CleanupProgressListener): Promise<CleanupScanResult> {
    if (this.executing) {
      throw new Error('Cannot scan while cleanup is running')
    }
    if (this.scanning) {
      throw new Error('A cleanup scan is already running')
    }

    this.scanning = true
    this.scanAbort = new AbortController()
    const signal = this.scanAbort.signal
    const startedAt = Date.now()
    const warnings: string[] = []

    const emit: CleanupProgressEmitter = (event) => onProgress?.(event)

    const ctx: CleanupModuleContext = {
      adapter: this.adapter,
      electronTempPath: app.getPath('temp'),
      signal
    }

    const categories: CleanupCategorySummary[] = []

    try {
      emit({
        phase: 'scanning',
        message: 'Preparing system scan…',
        percent: 2
      })

      for (let i = 0; i < cleanupModules.length; i++) {
        if (signal.aborted) {
          throw new Error('Scan cancelled')
        }

        const mod = cleanupModules[i]
        const percent = Math.round(((i + 0.5) / cleanupModules.length) * 90) + 5

        emit({
          phase: 'scanning',
          categoryId: mod.id,
          message: `Checking ${mod.label}…`,
          percent
        })

        try {
          const result = await mod.scan(ctx)
          categories.push({
            id: mod.id,
            label: mod.label,
            description: mod.description,
            estimatedBytes: result.estimatedBytes,
            estimatedFiles: result.estimatedFiles,
            risk: mod.risk,
            available: result.available,
            unavailableReason: result.unavailableReason,
            samplePaths: result.samplePaths
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Scan failed'
          log.warn(`Module scan failed: ${mod.id}`, message)
          warnings.push(`${mod.label}: ${message}`)
          categories.push({
            id: mod.id,
            label: mod.label,
            description: mod.description,
            estimatedBytes: 0,
            estimatedFiles: 0,
            risk: mod.risk,
            available: false,
            unavailableReason: message,
            samplePaths: []
          })
        }
      }

      emit({
        phase: 'finalizing',
        message: 'Scan complete — ready to optimize',
        percent: 100
      })
    } finally {
      this.scanning = false
      this.scanAbort = null
    }

    const totalBytes = categories.reduce((sum, c) => sum + c.estimatedBytes, 0)
    const totalFiles = categories.reduce((sum, c) => sum + c.estimatedFiles, 0)
    const durationMs = Date.now() - startedAt

    log.info('Cleanup scan finished', { durationMs, totalBytes, totalFiles })

    return {
      scannedAt: Date.now(),
      platform: this.adapter.platformId,
      categories,
      totalBytes,
      totalFiles,
      warnings,
      durationMs
    }
  }

  /**
   * Executes cleanup for the selected categories only.
   */
  async execute(
    options: CleanupExecuteOptions,
    onProgress?: CleanupProgressListener
  ): Promise<CleanupResult> {
    if (this.executing) {
      throw new Error('A cleanup operation is already running')
    }
    if (this.scanning) {
      throw new Error('Cannot clean while a scan is running')
    }

    const selected = [...new Set(options.categories)].filter((id) =>
      VALID_CATEGORY_IDS.has(id)
    )

    if (selected.length === 0) {
      throw new Error('Select at least one cleanup category')
    }

    this.executing = true
    this.executeAbort = new AbortController()
    const signal = this.executeAbort.signal
    const startedAt = Date.now()
    const emit: CleanupProgressEmitter = (event) => onProgress?.(event)

    const ctx: CleanupModuleContext = {
      adapter: this.adapter,
      electronTempPath: app.getPath('temp'),
      signal
    }

    const steps: CleanupStepResult[] = []
    const warnings: string[] = []
    let bytesFreed = 0
    let filesRemoved = 0
    let cancelled = false

    try {
      emit({
        phase: 'preparing',
        message: 'Preparing optimization…',
        percent: 3
      })

      for (let i = 0; i < selected.length; i++) {
        if (signal.aborted) {
          cancelled = true
          break
        }

        const id = selected[i]
        const mod = getCleanupModule(id)
        if (!mod) {
          steps.push({
            id,
            label: id,
            status: 'skipped',
            bytesFreed: 0,
            filesRemoved: 0,
            detail: 'Unknown cleanup module'
          })
          continue
        }

        const basePercent = Math.round((i / selected.length) * 90) + 5
        const span = Math.max(1, Math.round(90 / selected.length))

        emit({
          phase: `cleaning-${id}`,
          categoryId: id,
          message: `Optimizing ${mod.label}…`,
          percent: basePercent,
          bytesFreedSoFar: bytesFreed
        })

        try {
          const scan = await mod.scan(ctx)
          if (!scan.available || scan.targets.length === 0) {
            steps.push({
              id: mod.id,
              label: mod.label,
              status: 'skipped',
              bytesFreed: 0,
              filesRemoved: 0,
              detail: scan.unavailableReason ?? 'Already clear',
            })
            continue
          }

          const wrappedEmit: CleanupProgressEmitter = (event) => {
            emit({
              ...event,
              percent: Math.min(
                95,
                basePercent + Math.round((event.percent / 100) * span)
              ),
              bytesFreedSoFar: bytesFreed + (event.bytesFreedSoFar ?? 0)
            })
          }

          const cleaned = await mod.clean(scan.targets, ctx, wrappedEmit)

          if (cleaned.cancelled || signal.aborted) {
            cancelled = true
            steps.push({
              id: mod.id,
              label: mod.label,
              status: 'cancelled',
              bytesFreed: cleaned.bytesFreed,
              filesRemoved: cleaned.filesRemoved,
              detail: cleaned.detail,
              error: cleaned.error
            })
            bytesFreed += cleaned.bytesFreed
            filesRemoved += cleaned.filesRemoved
            break
          }

          bytesFreed += cleaned.bytesFreed
          filesRemoved += cleaned.filesRemoved

          const noProgress =
            cleaned.bytesFreed === 0 && cleaned.filesRemoved === 0
          const hasHardError =
            Boolean(cleaned.error) &&
            !/eperm|not permitted|ebusy|busy|access is denied|eacces|locked/i.test(
              cleaned.error ?? ''
            )

          // Locked/in-use files are normal — never surface as hard failures
          let status: CleanupStepResult['status'] = 'completed'
          if (noProgress && hasHardError) {
            status = 'failed'
          } else if (noProgress && cleaned.error) {
            status = 'skipped'
          }

          steps.push({
            id: mod.id,
            label: mod.label,
            status,
            bytesFreed: cleaned.bytesFreed,
            filesRemoved: cleaned.filesRemoved,
            detail:
              cleaned.detail ??
              (status === 'skipped'
                ? 'Already clear — protected items left in place'
                : undefined),
            error: cleaned.error
          })

          if (cleaned.error && hasHardError) {
            warnings.push(`${mod.label}: ${cleaned.error}`)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Cleanup failed'
          log.warn(`Module clean failed: ${id}`, message)
          warnings.push(`${mod.label}: ${message}`)
          steps.push({
            id: mod.id,
            label: mod.label,
            status: 'failed',
            bytesFreed: 0,
            filesRemoved: 0,
            error: message
          })
        }

        emit({
          phase: `cleaning-${id}`,
          categoryId: id,
          message: `${mod.label} optimized`,
          percent: Math.min(98, basePercent + span),
          bytesFreedSoFar: bytesFreed
        })
      }

      emit({
        phase: 'finalizing',
        message: cancelled ? 'Optimization paused' : 'Optimization complete',
        percent: 100,
        bytesFreedSoFar: bytesFreed
      })
    } finally {
      this.executing = false
      this.executeAbort = null
    }

    const durationMs = Date.now() - startedAt
    const completed = steps.some((s) => s.status === 'completed')

    log.info('Cleanup execute finished', {
      durationMs,
      bytesFreed,
      filesRemoved,
      cancelled
    })

    return {
      success:
        !cancelled && (completed || bytesFreed > 0 || filesRemoved > 0),
      cancelled,
      durationMs,
      bytesFreed,
      filesRemoved,
      steps,
      warnings
    }
  }
}

export const cleanupService = new CleanupService()

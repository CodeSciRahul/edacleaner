import type {
  SmartScanAreaResult,
  SmartScanProgressEvent,
  SmartScanResult
} from '@shared/interfaces'
import { createLogger } from '@main/utils/logger'
import { createPlatformBoostAdapter } from '@main/services/boost/platforms/create-adapter'
import { cleanupService } from '@main/services/cleanup'
import { formatBytes } from '@shared/utils'
import { smartScanModules } from './modules'
import type { SmartScanProgressEmitter } from './modules/types'

const log = createLogger('SmartScanService')

export type SmartScanProgressListener = (event: SmartScanProgressEvent) => void

function computeHealthScore(areas: SmartScanAreaResult[]): number {
  let score = 100
  for (const area of areas) {
    if (area.status === 'issue') score -= 18
    else if (area.status === 'warning') score -= 8
  }
  return Math.max(28, Math.min(98, score))
}

function buildSummary(areas: SmartScanAreaResult[], healthScore: number): {
  title: string
  message: string
} {
  const attention = areas.filter((a) => a.status !== 'good').length
  const reclaimable = areas.reduce((sum, a) => sum + (a.reclaimableBytes ?? 0), 0)

  if (attention === 0) {
    return {
      title: 'System is healthy',
      message: 'No critical issues detected. Your PC is running well.'
    }
  }

  if (healthScore >= 80) {
    return {
      title: 'Looking sharp — a few easy wins',
      message:
        reclaimable > 0
          ? `Up to ${formatBytes(reclaimable)} can be reclaimed. Review the recommendations below.`
          : 'A few areas could use a quick tune-up. Review the recommendations below.'
    }
  }

  return {
    title:
      attention === 1
        ? '1 area ready to optimize'
        : `${attention} areas ready to optimize`,
    message:
      reclaimable > 0
        ? `We found up to ${formatBytes(reclaimable)} you can reclaim — start with the safest fixes first.`
        : 'Review the findings below and apply the recommended optimizations.'
  }
}

export class SmartScanService {
  private readonly adapter = createPlatformBoostAdapter()
  private abortController: AbortController | null = null
  private running = false

  isRunning(): boolean {
    return this.running
  }

  cancel(): { cancelled: boolean } {
    if (!this.running || !this.abortController) {
      return { cancelled: false }
    }
    this.abortController.abort()
    // Nested cleanup scan uses its own controller — cancel it too
    cleanupService.cancel()
    log.info('Smart Scan cancelled by user')
    return { cancelled: true }
  }

  async run(onProgress?: SmartScanProgressListener): Promise<SmartScanResult> {
    if (this.running) {
      throw new Error('A Smart Scan is already running')
    }

    this.running = true
    this.abortController = new AbortController()
    const signal = this.abortController.signal
    const startedAt = Date.now()
    const warnings: string[] = []
    const areas: SmartScanAreaResult[] = []

    const emit: SmartScanProgressEmitter = (event) => onProgress?.(event)

    try {
      emit({
        phase: 'preparing',
        message: 'Preparing Smart Scan…',
        percent: 2
      })

      const moduleCount = smartScanModules.length

      for (let i = 0; i < moduleCount; i++) {
        if (signal.aborted) {
          throw new Error('Scan cancelled')
        }

        const mod = smartScanModules[i]
        const basePercent = Math.round((i / moduleCount) * 90) + 4
        const spanPercent = Math.max(8, Math.round(90 / moduleCount))

        emit({
          phase: `scanning-${mod.id}`,
          areaId: mod.id,
          message: `Checking ${mod.label}…`,
          percent: basePercent
        })

        try {
          const area = await mod.scan({
            signal,
            emit,
            basePercent,
            spanPercent
          })
          areas.push(area)
        } catch (err) {
          if (signal.aborted) throw err
          log.warn(`Smart Scan module soft-failed: ${mod.id}`, err)
          // Soft-skip — never interrupt the overall experience
          areas.push({
            id: mod.id,
            label: mod.label,
            description: mod.description,
            status: 'good',
            finding: 'Checked — looking healthy',
            href: mod.href
          })
        }

        emit({
          phase: `scanning-${mod.id}`,
          areaId: mod.id,
          message: `${mod.label} complete`,
          percent: Math.min(96, basePercent + spanPercent)
        })
      }

      emit({
        phase: 'finalizing',
        message: 'Building your optimization report…',
        percent: 98
      })
    } finally {
      this.running = false
      this.abortController = null
    }

    const durationMs = Date.now() - startedAt
    const healthScore = computeHealthScore(areas)
    const totalReclaimableBytes = areas.reduce(
      (sum, a) => sum + (a.reclaimableBytes ?? 0),
      0
    )
    const storageArea = areas.find((a) => a.id === 'storage')
    const performanceArea = areas.find((a) => a.id === 'performance')
    const duplicateBytes = storageArea?.reclaimableBytes ?? 0

    let estimatedBootSeconds = 0
    const bootMetric = performanceArea?.metricValue ?? ''
    const bootMatch = bootMetric.match(/−?(\d+)/)
    if (bootMatch) {
      estimatedBootSeconds = Number(bootMatch[1]) || 0
    }

    const areasNeedingAttention = areas.filter((a) => a.status !== 'good').length
    const filesScanned = areas.reduce((sum, a) => sum + (a.filesScanned ?? 0), 0)
    const summary = buildSummary(areas, healthScore)

    log.info('Smart Scan finished', {
      durationMs,
      healthScore,
      areasNeedingAttention,
      totalReclaimableBytes,
      filesScanned
    })

    emit({
      phase: 'finalizing',
      message: 'Smart Scan complete',
      percent: 100
    })

    return {
      scannedAt: Date.now(),
      durationMs,
      platform: this.adapter.platformId,
      healthScore,
      areas,
      totalReclaimableBytes,
      duplicateBytes,
      estimatedBootSeconds,
      areasNeedingAttention,
      filesScanned,
      summaryTitle: summary.title,
      summaryMessage: summary.message,
      warnings
    }
  }
}

export const smartScanService = new SmartScanService()

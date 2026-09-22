import { formatBytes } from '@shared/utils'
import type { SmartScanAreaResult } from '@shared/interfaces'
import { cleanupService } from '@main/services/cleanup'
import type { SmartScanModule, SmartScanModuleContext } from './types'

/** Residual junk below this still counts as healthy (temps regenerate quickly). */
const CLEANUP_GOOD_MAX_BYTES = 64 * 1024 * 1024
/** Above this → Optimize badge. */
const CLEANUP_ISSUE_MIN_BYTES = 2 * 1024 * 1024 * 1024

export const cleanupScanModule: SmartScanModule = {
  id: 'cleanup',
  label: 'Cleanup',
  description: 'Junk files, temp data, and caches',
  href: '/cleanup',

  async scan(ctx: SmartScanModuleContext): Promise<SmartScanAreaResult> {
    ctx.emit({
      phase: 'scanning-cleanup',
      areaId: 'cleanup',
      message: 'Checking junk and reclaimable caches…',
      percent: ctx.basePercent + 5
    })

    if (cleanupService.isRunning()) {
      return {
        id: 'cleanup',
        label: this.label,
        description: this.description,
        status: 'good',
        finding: 'Cleanup is already in progress',
        href: this.href,
        metricLabel: 'Reclaimable Space',
        metricValue: '—'
      }
    }

    try {
      const result = await cleanupService.scan((progress) => {
        if (ctx.signal.aborted) return
        const local = Math.min(100, Math.max(0, progress.percent))
        ctx.emit({
          phase: 'scanning-cleanup',
          areaId: 'cleanup',
          message: progress.message || 'Scanning cleanup opportunities…',
          percent: ctx.basePercent + Math.round((local / 100) * ctx.spanPercent),
          currentItem: progress.currentItem
        })
      })

      const bytes = result.totalBytes

      let status: SmartScanAreaResult['status'] = 'good'
      let finding = 'Looking clean — no action needed'

      if (bytes >= CLEANUP_ISSUE_MIN_BYTES) {
        status = 'issue'
        finding = `${formatBytes(bytes)} ready to reclaim`
      } else if (bytes >= CLEANUP_GOOD_MAX_BYTES) {
        status = 'warning'
        finding = `${formatBytes(bytes)} ready to reclaim`
      } else if (bytes > 0) {
        // Tiny residual (locked temps, regenerating caches) — still healthy
        finding = `Looking clean — only ${formatBytes(bytes)} of optional clutter`
      }

      return {
        id: 'cleanup',
        label: this.label,
        description: this.description,
        status,
        finding,
        href: this.href,
        reclaimableBytes: bytes,
        filesScanned: result.totalFiles,
        metricLabel: 'Reclaimable Space',
        metricValue: formatBytes(bytes)
      }
    } catch {
      // Soft-skip non-critical failures
      return {
        id: 'cleanup',
        label: this.label,
        description: this.description,
        status: 'good',
        finding: 'Checked — looking healthy',
        href: this.href,
        metricLabel: 'Reclaimable Space',
        metricValue: formatBytes(0)
      }
    }
  }
}

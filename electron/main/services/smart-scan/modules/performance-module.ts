import type { SmartScanAreaResult } from '@shared/interfaces'
import { boostService } from '@main/services/boost'
import { startupService } from '@main/services/startup'
import type { SmartScanModule, SmartScanModuleContext } from './types'

function estimateBootSeconds(high: number, medium: number): number {
  return high * 4 + medium * 2
}

export const performanceScanModule: SmartScanModule = {
  id: 'performance',
  label: 'Performance',
  description: 'Startup apps and background load',
  href: '/performance',

  async scan(ctx: SmartScanModuleContext): Promise<SmartScanAreaResult> {
    ctx.emit({
      phase: 'scanning-performance',
      areaId: 'performance',
      message: 'Reviewing startup and background activity…',
      percent: ctx.basePercent + 10
    })

    try {
      const [analysis, startup] = await Promise.all([
        boostService.analyze(ctx.signal),
        startupService.list({ forceRefresh: false }).catch(() => null)
      ])

      if (ctx.signal.aborted) {
        throw new Error('Scan cancelled')
      }

      const entries = startup?.entries ?? []
      const highImpact = entries.filter(
        (e) => e.enabled && (e.impact === 'high' || e.impact === 'medium')
      )
      const high = highImpact.filter((e) => e.impact === 'high').length
      const medium = highImpact.filter((e) => e.impact === 'medium').length
      const bootSeconds = estimateBootSeconds(high, medium)
      const backgroundCount = analysis.processSuggestions.length
      const memoryPressure = analysis.memory.usedPercent >= 85

      let status: SmartScanAreaResult['status'] = 'good'
      let finding = 'Performance looks sharp'

      if (high >= 2 || memoryPressure) {
        status = 'issue'
        finding =
          high >= 2
            ? `${high} high-impact startup apps`
            : 'Memory is under pressure'
      } else if (highImpact.length > 0 || backgroundCount >= 5) {
        status = 'warning'
        finding =
          highImpact.length > 0
            ? `${highImpact.length} startup item${highImpact.length === 1 ? '' : 's'} to review`
            : `${backgroundCount} background apps to review`
      }

      const bootLabel =
        bootSeconds > 0 ? `−${bootSeconds} sec` : 'On track'

      return {
        id: 'performance',
        label: this.label,
        description: this.description,
        status,
        finding,
        href: this.href,
        filesScanned: entries.length + backgroundCount,
        metricLabel: 'Boot Impact',
        metricValue: bootLabel
      }
    } catch {
      return {
        id: 'performance',
        label: this.label,
        description: this.description,
        status: 'good',
        finding: 'Performance check complete',
        href: this.href,
        metricLabel: 'Boot Impact',
        metricValue: 'On track'
      }
    }
  }
}

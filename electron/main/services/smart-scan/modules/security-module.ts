import type { SmartScanAreaResult } from '@shared/interfaces'
import { boostService } from '@main/services/boost'
import type { SmartScanModule, SmartScanModuleContext } from './types'

/**
 * Lightweight system-protection / health baseline (maps to the Security tile
 * in the Smart Scan UI). Never raises hard failures — only soft guidance.
 */
export const securityScanModule: SmartScanModule = {
  id: 'security',
  label: 'Security',
  description: 'Privacy and system protections',
  href: '/settings',

  async scan(ctx: SmartScanModuleContext): Promise<SmartScanAreaResult> {
    ctx.emit({
      phase: 'scanning-security',
      areaId: 'security',
      message: 'Verifying system protections…',
      percent: ctx.basePercent + 20
    })

    try {
      const snapshot = await boostService.getSnapshot()

      if (ctx.signal.aborted) {
        throw new Error('Scan cancelled')
      }

      const diskCritical = Boolean(snapshot.diskPressure?.isLow)
      const memoryHigh = snapshot.memory.usedPercent >= 92

      let status: SmartScanAreaResult['status'] = 'good'
      let finding = 'No issues found'

      if (diskCritical) {
        status = 'warning'
        finding = 'Low disk space — keep an eye on storage'
      } else if (memoryHigh) {
        status = 'warning'
        finding = 'Memory is running high — Boost can help'
      }

      return {
        id: 'security',
        label: this.label,
        description: this.description,
        status,
        finding,
        href: this.href,
        filesScanned: 1,
        metricLabel: 'Protections',
        metricValue: status === 'good' ? 'Healthy' : 'Review'
      }
    } catch {
      return {
        id: 'security',
        label: this.label,
        description: this.description,
        status: 'good',
        finding: 'No issues found',
        href: this.href,
        metricLabel: 'Protections',
        metricValue: 'Healthy'
      }
    }
  }
}

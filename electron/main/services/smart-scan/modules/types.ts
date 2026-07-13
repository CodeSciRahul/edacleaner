import type {
  SmartScanAreaId,
  SmartScanAreaResult,
  SmartScanProgressEvent
} from '@shared/interfaces'

export type SmartScanProgressEmitter = (event: SmartScanProgressEvent) => void

export interface SmartScanModuleContext {
  signal: AbortSignal
  emit: SmartScanProgressEmitter
  /** Base percent for this module's slice of the overall bar */
  basePercent: number
  /** Width of this module's slice (0–100) */
  spanPercent: number
}

/**
 * Pluggable Smart Scan module. Register new modules in the registry
 * to extend coverage without changing the orchestrator.
 */
export interface SmartScanModule {
  readonly id: SmartScanAreaId
  readonly label: string
  readonly description: string
  readonly href: string

  scan(ctx: SmartScanModuleContext): Promise<SmartScanAreaResult>
}

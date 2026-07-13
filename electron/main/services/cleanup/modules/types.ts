import type {
  CleanupCategoryId,
  CleanupProgressEvent,
  CleanupRiskLevel
} from '@shared/interfaces'
import type { PlatformBoostAdapter } from '@main/services/boost/platforms/platform-adapter'

export interface CleanupTargetDirectory {
  kind: 'directory'
  path: string
  /** Soft cap on entries removed during clean. */
  maxEntries?: number
}

export interface CleanupTargetTrash {
  kind: 'trash'
}

export type CleanupTarget = CleanupTargetDirectory | CleanupTargetTrash

export interface CleanupModuleScanResult {
  estimatedBytes: number
  estimatedFiles: number
  available: boolean
  unavailableReason?: string
  samplePaths: string[]
  targets: CleanupTarget[]
}

export interface CleanupModuleCleanResult {
  bytesFreed: number
  filesRemoved: number
  detail?: string
  error?: string
  cancelled?: boolean
}

export interface CleanupModuleContext {
  adapter: PlatformBoostAdapter
  electronTempPath: string
  signal?: AbortSignal
}

export type CleanupProgressEmitter = (event: CleanupProgressEvent) => void

/**
 * Pluggable cleanup category. Add new modules by implementing this interface
 * and registering them in the module registry.
 */
export interface CleanupModule {
  readonly id: CleanupCategoryId
  readonly label: string
  readonly description: string
  readonly risk: CleanupRiskLevel

  scan(ctx: CleanupModuleContext): Promise<CleanupModuleScanResult>
  clean(
    targets: CleanupTarget[],
    ctx: CleanupModuleContext,
    emit: CleanupProgressEmitter
  ): Promise<CleanupModuleCleanResult>
}

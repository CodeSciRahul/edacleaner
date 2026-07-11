import type {
  BoostDiskPressure,
  BoostProcessInfo,
  BoostStartupAppInfo
} from '@shared/interfaces'

export interface PlatformCleanResult {
  bytesRemoved: number
  detail: string
  errors: string[]
}

export interface PlatformTrashResult {
  emptied: boolean
  detail: string
  error?: string
}

export interface PlatformDnsResult {
  flushed: boolean
  detail: string
  error?: string
}

export interface PlatformTerminateResult {
  terminated: number
  failed: Array<{ pid: number; error: string }>
  detail: string
}

/**
 * Platform-specific Boost capabilities.
 * Shared/cross-platform work (temp via Electron paths) lives in BoostService;
 * adapters own OS commands that differ per platform.
 */
export interface PlatformBoostAdapter {
  readonly platformId: 'win32' | 'darwin' | 'linux' | 'unsupported'

  supportsEmptyTrash(): boolean
  supportsDnsFlush(): boolean
  supportsStartupEnumeration(): boolean

  listProcesses(limit?: number): Promise<BoostProcessInfo[]>
  listStartupApps(): Promise<BoostStartupAppInfo[]>

  getDiskPressure(): Promise<BoostDiskPressure | null>

  /** Platform-specific cache directories (browser caches, etc.). */
  getCacheDirectories(): Promise<string[]>

  /** Extra temp directories beyond Electron's temp path. */
  getTempDirectories(): Promise<string[]>

  emptyTrash(signal?: AbortSignal): Promise<PlatformTrashResult>
  flushDnsCache(signal?: AbortSignal): Promise<PlatformDnsResult>
  terminateProcesses(
    pids: number[],
    signal?: AbortSignal
  ): Promise<PlatformTerminateResult>
}

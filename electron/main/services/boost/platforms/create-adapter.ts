import type { PlatformBoostAdapter } from './platform-adapter'
import { WindowsBoostAdapter } from './windows-adapter'
import { MacosBoostAdapter } from './macos-adapter'
import { LinuxBoostAdapter } from './linux-adapter'
import type {
  BoostDiskPressure,
  BoostProcessInfo,
  BoostStartupAppInfo
} from '@shared/interfaces'
import type {
  PlatformDnsResult,
  PlatformTerminateResult,
  PlatformTrashResult
} from './platform-adapter'

/** Fallback when running on an unsupported OS. */
class UnsupportedBoostAdapter implements PlatformBoostAdapter {
  readonly platformId = 'unsupported' as const

  supportsEmptyTrash(): boolean {
    return false
  }
  supportsDnsFlush(): boolean {
    return false
  }
  supportsStartupEnumeration(): boolean {
    return false
  }
  async listProcesses(): Promise<BoostProcessInfo[]> {
    return []
  }
  async listStartupApps(): Promise<BoostStartupAppInfo[]> {
    return []
  }
  async getDiskPressure(): Promise<BoostDiskPressure | null> {
    return null
  }
  async getCacheDirectories(): Promise<string[]> {
    return []
  }
  async getTempDirectories(): Promise<string[]> {
    return []
  }
  async emptyTrash(): Promise<PlatformTrashResult> {
    return {
      emptied: false,
      detail: 'Empty trash is not supported on this platform',
      error: 'Unsupported platform'
    }
  }
  async flushDnsCache(): Promise<PlatformDnsResult> {
    return {
      flushed: false,
      detail: 'DNS flush is not supported on this platform',
      error: 'Unsupported platform'
    }
  }
  async terminateProcesses(): Promise<PlatformTerminateResult> {
    return {
      terminated: 0,
      failed: [],
      detail: 'Process termination is not supported on this platform'
    }
  }
}

export function createPlatformBoostAdapter(): PlatformBoostAdapter {
  switch (process.platform) {
    case 'win32':
      return new WindowsBoostAdapter()
    case 'darwin':
      return new MacosBoostAdapter()
    case 'linux':
      return new LinuxBoostAdapter()
    default:
      return new UnsupportedBoostAdapter()
  }
}

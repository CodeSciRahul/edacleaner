import type { StartupAppEntry, StartupMutationResult } from '@shared/interfaces'
import type { PlatformStartupAdapter } from './platform-adapter'
import { WindowsStartupAdapter } from './windows-adapter'
import { MacosStartupAdapter } from './macos-adapter'
import { LinuxStartupAdapter } from './linux-adapter'

class UnsupportedStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'unsupported' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    return []
  }

  async setEnabled(): Promise<StartupMutationResult> {
    return {
      success: false,
      error: 'Startup management is not supported on this platform'
    }
  }
}

export function createPlatformStartupAdapter(): PlatformStartupAdapter {
  switch (process.platform) {
    case 'win32':
      return new WindowsStartupAdapter()
    case 'darwin':
      return new MacosStartupAdapter()
    case 'linux':
      return new LinuxStartupAdapter()
    default:
      return new UnsupportedStartupAdapter()
  }
}

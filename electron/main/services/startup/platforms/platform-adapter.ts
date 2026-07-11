import type { StartupAppEntry, StartupMutationResult } from '@shared/interfaces'

/**
 * Platform-specific startup entry management.
 * Only user-manageable locations — never services / HKLM writes / system LaunchDaemons.
 */
export interface PlatformStartupAdapter {
  readonly platformId: 'win32' | 'darwin' | 'linux' | 'unsupported'

  listEntries(): Promise<StartupAppEntry[]>

  /**
   * Enable or disable a previously listed entry.
   * Must validate that the id belongs to a toggleable user entry.
   */
  setEnabled(id: string, enabled: boolean): Promise<StartupMutationResult>
}

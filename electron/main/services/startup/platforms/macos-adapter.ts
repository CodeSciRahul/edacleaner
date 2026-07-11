import { homedir } from 'os'
import { basename, join } from 'path'
import { access, rename, readdir } from 'fs/promises'
import type { StartupAppEntry, StartupMutationResult } from '@shared/interfaces'
import type { PlatformStartupAdapter } from './platform-adapter'
import {
  classifyStartupImpact,
  decodeId,
  encodeId,
  isProtectedStartupName
} from './startup-safety'
import { createLogger } from '@main/utils/logger'

const log = createLogger('startup:mac')

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function agentsDir(): string {
  return join(homedir(), 'Library', 'LaunchAgents')
}

/**
 * User LaunchAgents only. Disable by renaming to *.disabled — reversible, no delete.
 * System /Library/LaunchAgents are never touched.
 */
export class MacosStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'darwin' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []
    const dir = agentsDir()
    if (!(await pathExists(dir))) return entries

    try {
      const files = await readdir(dir)
      for (const file of files) {
        const isDisabled = file.endsWith('.disabled')
        const baseName = isDisabled ? file.replace(/\.disabled$/i, '') : file
        if (!baseName.endsWith('.plist')) continue

        const name = baseName.replace(/\.plist$/i, '')
        const protectedReason = isProtectedStartupName(name)
        const fullPath = join(dir, file)

        entries.push({
          id: encodeId(['launch-agent', baseName]),
          name,
          location: fullPath,
          source: 'User LaunchAgents',
          sourceKind: 'launch-agent',
          enabled: !isDisabled,
          canToggle: !protectedReason,
          impact: classifyStartupImpact(name),
          details: fullPath,
          protectedReason: protectedReason ?? undefined
        })
      }
    } catch (err) {
      log.warn('LaunchAgents list failed', err instanceof Error ? err.message : err)
    }

    return entries
  }

  async setEnabled(id: string, enabled: boolean): Promise<StartupMutationResult> {
    const parts = decodeId(id)
    if (parts[0] !== 'launch-agent' || parts.length < 2) {
      return { success: false, error: 'Invalid LaunchAgent id' }
    }

    const plistName = parts.slice(1).join('::')
    const protectedReason = isProtectedStartupName(plistName)
    if (protectedReason) {
      return { success: false, error: protectedReason }
    }

    const dir = agentsDir()
    const activePath = join(dir, plistName)
    const disabledPath = join(dir, `${plistName}.disabled`)

    try {
      if (!enabled) {
        if (!(await pathExists(activePath))) {
          return { success: false, error: 'LaunchAgent not found' }
        }
        await rename(activePath, disabledPath)
        log.info('Disabled LaunchAgent', plistName)
        return {
          success: true,
          entry: {
            id,
            name: basename(plistName, '.plist'),
            location: disabledPath,
            source: 'User LaunchAgents',
            sourceKind: 'launch-agent',
            enabled: false,
            canToggle: true,
            impact: classifyStartupImpact(plistName)
          }
        }
      }

      if (!(await pathExists(disabledPath))) {
        return { success: false, error: 'Disabled LaunchAgent not found' }
      }
      await rename(disabledPath, activePath)
      log.info('Enabled LaunchAgent', plistName)
      return {
        success: true,
        entry: {
          id,
          name: basename(plistName, '.plist'),
          location: activePath,
          source: 'User LaunchAgents',
          sourceKind: 'launch-agent',
          enabled: true,
          canToggle: true,
          impact: classifyStartupImpact(plistName)
        }
      }
    } catch (err) {
      log.error('LaunchAgent toggle failed', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update LaunchAgent'
      }
    }
  }
}

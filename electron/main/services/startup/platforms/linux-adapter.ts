import { homedir } from 'os'
import { basename, join } from 'path'
import { access, readFile, readdir, writeFile } from 'fs/promises'
import type { StartupAppEntry, StartupMutationResult } from '@shared/interfaces'
import type { PlatformStartupAdapter } from './platform-adapter'
import {
  classifyStartupImpact,
  decodeId,
  encodeId,
  isProtectedStartupName
} from './startup-safety'
import { createLogger } from '@main/utils/logger'

const log = createLogger('startup:linux')

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function autostartDir(): string {
  return join(homedir(), '.config', 'autostart')
}

function parseDesktop(content: string): { name: string; hidden: boolean; enabled: boolean } {
  const nameMatch = content.match(/^Name=(.+)$/m)
  const hiddenMatch = content.match(/^Hidden=(.+)$/m)
  const gnomeMatch = content.match(/^X-GNOME-Autostart-enabled=(.+)$/m)

  const hidden = hiddenMatch?.[1]?.trim().toLowerCase() === 'true'
  const gnomeDisabled = gnomeMatch?.[1]?.trim().toLowerCase() === 'false'

  return {
    name: nameMatch?.[1]?.trim() ?? '',
    hidden,
    enabled: !hidden && !gnomeDisabled
  }
}

function setDesktopEnabled(content: string, enabled: boolean): string {
  let next = content

  const ensureKey = (key: string, value: string): void => {
    const re = new RegExp(`^${key}=.*$`, 'm')
    if (re.test(next)) {
      next = next.replace(re, `${key}=${value}`)
    } else {
      // Insert after [Desktop Entry] if present
      if (/^\[Desktop Entry\]/m.test(next)) {
        next = next.replace(/^\[Desktop Entry\]\s*$/m, `[Desktop Entry]\n${key}=${value}`)
      } else {
        next = `${key}=${value}\n${next}`
      }
    }
  }

  if (enabled) {
    ensureKey('Hidden', 'false')
    ensureKey('X-GNOME-Autostart-enabled', 'true')
  } else {
    ensureKey('Hidden', 'true')
    ensureKey('X-GNOME-Autostart-enabled', 'false')
  }

  return next
}

/**
 * FreeDesktop autostart (~/.config/autostart). Toggle via Hidden / X-GNOME-Autostart-enabled.
 * Never deletes .desktop files.
 */
export class LinuxStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'linux' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []
    const dir = autostartDir()
    if (!(await pathExists(dir))) return entries

    try {
      const files = await readdir(dir)
      for (const file of files) {
        if (!file.endsWith('.desktop')) continue
        const fullPath = join(dir, file)
        let content = ''
        try {
          content = await readFile(fullPath, 'utf-8')
        } catch {
          continue
        }

        const parsed = parseDesktop(content)
        const name = parsed.name || file.replace(/\.desktop$/i, '')
        const protectedReason = isProtectedStartupName(name)

        entries.push({
          id: encodeId(['autostart', file]),
          name,
          location: fullPath,
          source: 'XDG Autostart',
          sourceKind: 'autostart-desktop',
          enabled: parsed.enabled,
          canToggle: !protectedReason,
          impact: classifyStartupImpact(name),
          details: fullPath,
          protectedReason: protectedReason ?? undefined
        })
      }
    } catch (err) {
      log.warn('Autostart list failed', err instanceof Error ? err.message : err)
    }

    return entries
  }

  async setEnabled(id: string, enabled: boolean): Promise<StartupMutationResult> {
    const parts = decodeId(id)
    if (parts[0] !== 'autostart' || parts.length < 2) {
      return { success: false, error: 'Invalid autostart id' }
    }

    const fileName = parts.slice(1).join('::')
    const fullPath = join(autostartDir(), fileName)

    try {
      const content = await readFile(fullPath, 'utf-8')
      const parsed = parseDesktop(content)
      const name = parsed.name || basename(fileName, '.desktop')
      const protectedReason = isProtectedStartupName(name)
      if (protectedReason) {
        return { success: false, error: protectedReason }
      }

      const updated = setDesktopEnabled(content, enabled)
      await writeFile(fullPath, updated, 'utf-8')
      log.info('Updated autostart entry', fileName, enabled)

      return {
        success: true,
        entry: {
          id,
          name,
          location: fullPath,
          source: 'XDG Autostart',
          sourceKind: 'autostart-desktop',
          enabled,
          canToggle: true,
          impact: classifyStartupImpact(name)
        }
      }
    } catch (err) {
      log.error('Autostart toggle failed', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update autostart entry'
      }
    }
  }
}

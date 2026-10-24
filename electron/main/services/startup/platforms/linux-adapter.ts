import { homedir } from 'os'
import { basename, join } from 'path'
import { access, mkdir, readFile, readdir, writeFile } from 'fs/promises'
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

function userAutostartDir(): string {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME
  if (xdgConfigHome && xdgConfigHome.trim().length > 0) {
    return join(xdgConfigHome.trim(), 'autostart')
  }
  return join(homedir(), '.config', 'autostart')
}

function systemAutostartDirs(): string[] {
  const dirs: string[] = []
  const xdgConfigDirs = process.env.XDG_CONFIG_DIRS
  if (xdgConfigDirs && xdgConfigDirs.trim().length > 0) {
    for (const d of xdgConfigDirs.split(':')) {
      const trimmed = d.trim()
      if (trimmed) {
        dirs.push(join(trimmed, 'autostart'))
      }
    }
  }
  if (!dirs.includes('/etc/xdg/autostart')) {
    dirs.push('/etc/xdg/autostart')
  }
  if (!dirs.includes('/usr/share/autostart')) {
    dirs.push('/usr/share/autostart')
  }
  return dirs
}

export interface ParsedDesktop {
  name: string
  exec: string
  comment: string
  hidden: boolean
  enabled: boolean
}

export function parseDesktop(content: string): ParsedDesktop {
  const nameMatch = content.match(/^Name\s*=\s*(.+)$/m)
  const execMatch = content.match(/^Exec\s*=\s*(.+)$/m)
  const commentMatch = content.match(/^Comment\s*=\s*(.+)$/m)
  const hiddenMatch = content.match(/^Hidden\s*=\s*(.+)$/m)
  const gnomeMatch = content.match(/^X-GNOME-Autostart-enabled\s*=\s*(.+)$/m)

  const hidden = hiddenMatch?.[1]?.trim().toLowerCase() === 'true'
  const gnomeDisabled = gnomeMatch?.[1]?.trim().toLowerCase() === 'false'

  let exec = execMatch?.[1]?.trim() ?? ''
  // Strip desktop field codes (%u, %U, %f, %F, %i, %c, %k)
  exec = exec.replace(/\s+%[a-zA-Z]/g, '').trim()

  return {
    name: nameMatch?.[1]?.trim() ?? '',
    exec,
    comment: commentMatch?.[1]?.trim() ?? '',
    hidden,
    enabled: !hidden && !gnomeDisabled
  }
}

export function setDesktopEnabled(content: string, enabled: boolean): string {
  let next = content

  const ensureKey = (key: string, value: string): void => {
    const re = new RegExp(`^${key}\\s*=.*$`, 'm')
    if (re.test(next)) {
      next = next.replace(re, `${key}=${value}`)
    } else {
      if (/^\[Desktop Entry\]/m.test(next)) {
        next = next.replace(/^\[Desktop Entry\][^\r\n]*/m, (m) => `${m}\n${key}=${value}`)
      } else {
        next = `[Desktop Entry]\n${key}=${value}\n${next}`
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
 * FreeDesktop autostart (~/.config/autostart and /etc/xdg/autostart).
 * Supports user-level overrides for system-wide autostart entries without root.
 */
export class LinuxStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'linux' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []
    const seenFiles = new Map<string, StartupAppEntry>()

    // 1. Scan user autostart directory (~/.config/autostart)
    const userDir = userAutostartDir()
    if (await pathExists(userDir)) {
      try {
        const files = await readdir(userDir)
        for (const file of files) {
          if (!file.endsWith('.desktop')) continue
          const fullPath = join(userDir, file)
          let content = ''
          try {
            content = await readFile(fullPath, 'utf-8')
          } catch {
            continue
          }

          const parsed = parseDesktop(content)
          const name = parsed.name || file.replace(/\.desktop$/i, '')
          const protectedReason = isProtectedStartupName(name)
          const entry: StartupAppEntry = {
            id: encodeId(['autostart', file]),
            name,
            location: parsed.exec || fullPath,
            source: 'User Autostart',
            sourceKind: 'autostart-desktop',
            enabled: parsed.enabled,
            canToggle: !protectedReason,
            impact: classifyStartupImpact(name),
            details: parsed.comment ? `${parsed.comment} (${fullPath})` : fullPath,
            protectedReason: protectedReason ?? undefined
          }
          seenFiles.set(file.toLowerCase(), entry)
          entries.push(entry)
        }
      } catch (err) {
        log.warn('User autostart list failed', err instanceof Error ? err.message : err)
      }
    }

    // 2. Scan system autostart directories (/etc/xdg/autostart, etc.)
    const sysDirs = systemAutostartDirs()
    for (const sysDir of sysDirs) {
      if (!(await pathExists(sysDir))) continue
      try {
        const files = await readdir(sysDir)
        for (const file of files) {
          if (!file.endsWith('.desktop')) continue
          const fileLower = file.toLowerCase()
          const fullPath = join(sysDir, file)

          let content = ''
          try {
            content = await readFile(fullPath, 'utf-8')
          } catch {
            continue
          }

          const parsed = parseDesktop(content)
          const sysName = parsed.name || file.replace(/\.desktop$/i, '')

          // If already defined in user autostart directory:
          const existing = seenFiles.get(fileLower)
          if (existing) {
            // Enrich user entry if user file was a minimal override stub
            if (!existing.name || existing.name === file.replace(/\.desktop$/i, '')) {
              existing.name = sysName
              existing.impact = classifyStartupImpact(sysName)
            }
            if (!existing.location || existing.location.endsWith('.desktop')) {
              if (parsed.exec) existing.location = parsed.exec
            }
            continue
          }

          const protectedReason = isProtectedStartupName(sysName)
          const entry: StartupAppEntry = {
            id: encodeId(['autostart', file, fullPath]),
            name: sysName,
            location: parsed.exec || fullPath,
            source: 'System Autostart',
            sourceKind: 'autostart-desktop',
            enabled: parsed.enabled,
            canToggle: !protectedReason,
            impact: classifyStartupImpact(sysName),
            details: parsed.comment ? `${parsed.comment} (${fullPath})` : fullPath,
            protectedReason: protectedReason ?? undefined
          }
          seenFiles.set(fileLower, entry)
          entries.push(entry)
        }
      } catch (err) {
        log.warn(`System autostart list failed for ${sysDir}`, err instanceof Error ? err.message : err)
      }
    }

    return entries
  }

  async setEnabled(id: string, enabled: boolean): Promise<StartupMutationResult> {
    const parts = decodeId(id)
    if (parts[0] !== 'autostart' || parts.length < 2) {
      return { success: false, error: 'Invalid autostart id' }
    }

    const fileName = parts[1]
    const origSysPath = parts[2]
    const userDir = userAutostartDir()
    const userFilePath = join(userDir, fileName)

    try {
      const userExists = await pathExists(userFilePath)

      if (userExists) {
        const content = await readFile(userFilePath, 'utf-8')
        const parsed = parseDesktop(content)
        const name = parsed.name || basename(fileName, '.desktop')
        const protectedReason = isProtectedStartupName(name)
        if (protectedReason) {
          return { success: false, error: protectedReason }
        }

        const updated = setDesktopEnabled(content, enabled)
        await writeFile(userFilePath, updated, 'utf-8')
        log.info('Updated user autostart entry', fileName, enabled)

        return {
          success: true,
          entry: {
            id,
            name,
            location: parsed.exec || userFilePath,
            source: 'User Autostart',
            sourceKind: 'autostart-desktop',
            enabled,
            canToggle: true,
            impact: classifyStartupImpact(name)
          }
        }
      }

      // User file does not exist yet -> originated from system autostart dir
      let baseContent = ''
      if (origSysPath && (await pathExists(origSysPath))) {
        try {
          baseContent = await readFile(origSysPath, 'utf-8')
        } catch {
          // fallback below
        }
      }

      if (!baseContent) {
        for (const sysDir of systemAutostartDirs()) {
          const cand = join(sysDir, fileName)
          if (await pathExists(cand)) {
            try {
              baseContent = await readFile(cand, 'utf-8')
              break
            } catch {
              // continue
            }
          }
        }
      }

      const parsed = baseContent ? parseDesktop(baseContent) : { name: basename(fileName, '.desktop'), exec: '' }
      const name = parsed.name || basename(fileName, '.desktop')
      const protectedReason = isProtectedStartupName(name)
      if (protectedReason) {
        return { success: false, error: protectedReason }
      }

      const contentToUse =
        baseContent || `[Desktop Entry]\nType=Application\nName=${name}\nExec=${parsed.exec || ''}\n`
      const updated = setDesktopEnabled(contentToUse, enabled)

      await mkdir(userDir, { recursive: true })
      await writeFile(userFilePath, updated, 'utf-8')
      log.info('Created user override for system autostart entry', fileName, enabled)

      return {
        success: true,
        entry: {
          id,
          name,
          location: parsed.exec || userFilePath,
          source: 'User Autostart',
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

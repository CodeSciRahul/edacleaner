import { homedir } from 'os'
import { basename, join } from 'path'
import { access, mkdir, rename, readdir } from 'fs/promises'
import type { StartupAppEntry, StartupMutationResult } from '@shared/interfaces'
import type { PlatformStartupAdapter } from './platform-adapter'
import {
  classifyStartupImpact,
  decodeId,
  encodeId,
  isProtectedStartupName
} from './startup-safety'
import { runCommand } from '@main/services/boost/platforms/exec-utils'
import { createLogger } from '@main/utils/logger'

const log = createLogger('startup:win')

const BACKUP_REG_KEY = 'HKCU\\Software\\EDACleaner\\DisabledStartup'

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function userStartupDir(): string {
  return join(
    process.env.APPDATA ?? homedir(),
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup'
  )
}

function disabledStartupDir(): string {
  return join(userStartupDir(), 'EDACleanerDisabled')
}

function parseRegQuery(stdout: string): Array<{ name: string; command: string }> {
  const rows: Array<{ name: string; command: string }> = []
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s+(\S+)\s+REG_\w+\s+(.+)$/)
    if (!match) continue
    rows.push({ name: match[1], command: match[2].trim() })
  }
  return rows
}

export class WindowsStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'win32' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []

    // --- HKCU Run (toggleable) ---
    try {
      const { stdout } = await runCommand(
        'reg',
        ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'],
        { timeoutMs: 10_000 }
      )
      for (const row of parseRegQuery(stdout)) {
        const protectedReason = isProtectedStartupName(row.name)
        entries.push({
          id: encodeId(['hkcu-run', row.name]),
          name: row.name,
          location: row.command,
          source: 'Current User Run (Registry)',
          sourceKind: 'registry-hkcu',
          enabled: true,
          canToggle: !protectedReason,
          impact: classifyStartupImpact(row.name),
          details: `Registry: HKCU\\...\\Run\\${row.name}`,
          protectedReason: protectedReason ?? undefined
        })
      }
    } catch (err) {
      log.warn('HKCU Run list failed', err instanceof Error ? err.message : err)
    }

    // --- Disabled backups (HKCU) ---
    try {
      const { stdout } = await runCommand('reg', ['query', BACKUP_REG_KEY], {
        timeoutMs: 10_000
      })
      for (const row of parseRegQuery(stdout)) {
        entries.push({
          id: encodeId(['hkcu-run', row.name]),
          name: row.name,
          location: row.command,
          source: 'Current User Run (Registry)',
          sourceKind: 'registry-hkcu',
          enabled: false,
          canToggle: true,
          impact: classifyStartupImpact(row.name),
          details: 'Disabled via EDA Cleaner backup key'
        })
      }
    } catch {
      // Backup key may not exist yet
    }

    // --- HKLM Run (read-only) ---
    try {
      const { stdout } = await runCommand(
        'reg',
        ['query', 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'],
        { timeoutMs: 10_000 }
      )
      for (const row of parseRegQuery(stdout)) {
        entries.push({
          id: encodeId(['hklm-run', row.name]),
          name: row.name,
          location: row.command,
          source: 'All Users Run (Registry)',
          sourceKind: 'registry-hklm',
          enabled: true,
          canToggle: false,
          impact: classifyStartupImpact(row.name),
          details: 'Machine-wide entry — requires admin; view only',
          protectedReason: 'Machine-wide registry key (HKLM) is read-only'
        })
      }
    } catch (err) {
      log.warn('HKLM Run list failed', err instanceof Error ? err.message : err)
    }

    // --- User Startup folder ---
    const startupDir = userStartupDir()
    if (await pathExists(startupDir)) {
      try {
        const files = await readdir(startupDir)
        for (const file of files) {
          if (file === 'EDACleanerDisabled' || file.startsWith('.')) continue
          const fullPath = join(startupDir, file)
          const name = file.replace(/\.(lnk|exe|bat|cmd)$/i, '')
          const protectedReason = isProtectedStartupName(name)
          entries.push({
            id: encodeId(['startup-folder', file]),
            name,
            location: fullPath,
            source: 'Startup folder',
            sourceKind: 'startup-folder',
            enabled: true,
            canToggle: !protectedReason,
            impact: classifyStartupImpact(name),
            details: fullPath,
            protectedReason: protectedReason ?? undefined
          })
        }
      } catch (err) {
        log.warn('Startup folder list failed', err instanceof Error ? err.message : err)
      }
    }

    // --- Disabled Startup folder items ---
    const disabledDir = disabledStartupDir()
    if (await pathExists(disabledDir)) {
      try {
        const files = await readdir(disabledDir)
        for (const file of files) {
          if (file.startsWith('.')) continue
          const fullPath = join(disabledDir, file)
          const name = file.replace(/\.(lnk|exe|bat|cmd)$/i, '')
          entries.push({
            id: encodeId(['startup-folder', file]),
            name,
            location: fullPath,
            source: 'Startup folder',
            sourceKind: 'startup-folder',
            enabled: false,
            canToggle: true,
            impact: classifyStartupImpact(name),
            details: `Disabled — stored in ${disabledDir}`
          })
        }
      } catch (err) {
        log.warn('Disabled startup folder list failed', err instanceof Error ? err.message : err)
      }
    }

    return entries
  }

  async setEnabled(id: string, enabled: boolean): Promise<StartupMutationResult> {
    const parts = decodeId(id)
    if (parts.length < 2) {
      return { success: false, error: 'Invalid startup entry id' }
    }

    const [kind, ...rest] = parts
    const nameOrFile = rest.join('::')

    if (kind === 'hklm-run') {
      return {
        success: false,
        error: 'Cannot modify machine-wide (HKLM) startup entries without administrator rights'
      }
    }

    if (kind === 'hkcu-run') {
      return this.setRegistryEnabled(nameOrFile, enabled)
    }

    if (kind === 'startup-folder') {
      return this.setFolderEnabled(nameOrFile, enabled)
    }

    return { success: false, error: 'Unsupported startup entry type' }
  }

  private async setRegistryEnabled(
    valueName: string,
    enabled: boolean
  ): Promise<StartupMutationResult> {
    const protectedReason = isProtectedStartupName(valueName)
    if (protectedReason) {
      return { success: false, error: protectedReason }
    }

    const runKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'

    try {
      if (!enabled) {
        // Read current command
        const { stdout } = await runCommand('reg', ['query', runKey, '/v', valueName], {
          timeoutMs: 10_000
        })
        const parsed = parseRegQuery(stdout)
        const row = parsed.find((r) => r.name === valueName) ?? parsed[0]
        if (!row?.command) {
          return { success: false, error: 'Startup registry value not found' }
        }

        // Backup then delete from Run (never lose the command)
        await runCommand(
          'reg',
          ['add', BACKUP_REG_KEY, '/v', valueName, '/t', 'REG_SZ', '/d', row.command, '/f'],
          { timeoutMs: 10_000 }
        )
        await runCommand('reg', ['delete', runKey, '/v', valueName, '/f'], {
          timeoutMs: 10_000
        })

        log.info('Disabled HKCU Run entry', valueName)
        return {
          success: true,
          entry: {
            id: encodeId(['hkcu-run', valueName]),
            name: valueName,
            location: row.command,
            source: 'Current User Run (Registry)',
            sourceKind: 'registry-hkcu',
            enabled: false,
            canToggle: true,
            impact: classifyStartupImpact(valueName)
          }
        }
      }

      // Enable: restore from backup
      const { stdout } = await runCommand('reg', ['query', BACKUP_REG_KEY, '/v', valueName], {
        timeoutMs: 10_000
      })
      const parsed = parseRegQuery(stdout)
      const row = parsed.find((r) => r.name === valueName) ?? parsed[0]
      if (!row?.command) {
        return { success: false, error: 'No backup found to re-enable this entry' }
      }

      await runCommand(
        'reg',
        ['add', runKey, '/v', valueName, '/t', 'REG_SZ', '/d', row.command, '/f'],
        { timeoutMs: 10_000 }
      )
      await runCommand('reg', ['delete', BACKUP_REG_KEY, '/v', valueName, '/f'], {
        timeoutMs: 10_000
      })

      log.info('Enabled HKCU Run entry', valueName)
      return {
        success: true,
        entry: {
          id: encodeId(['hkcu-run', valueName]),
          name: valueName,
          location: row.command,
          source: 'Current User Run (Registry)',
          sourceKind: 'registry-hkcu',
          enabled: true,
          canToggle: true,
          impact: classifyStartupImpact(valueName)
        }
      }
    } catch (err) {
      log.error('Registry toggle failed', valueName, err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Registry update failed'
      }
    }
  }

  private async setFolderEnabled(
    fileName: string,
    enabled: boolean
  ): Promise<StartupMutationResult> {
    const protectedReason = isProtectedStartupName(fileName)
    if (protectedReason) {
      return { success: false, error: protectedReason }
    }

    const activePath = join(userStartupDir(), fileName)
    const disabledDir = disabledStartupDir()
    const disabledPath = join(disabledDir, fileName)

    try {
      await mkdir(disabledDir, { recursive: true })

      if (!enabled) {
        if (!(await pathExists(activePath))) {
          return { success: false, error: 'Startup shortcut not found' }
        }
        await rename(activePath, disabledPath)
        log.info('Disabled startup folder item', fileName)
        return {
          success: true,
          entry: {
            id: encodeId(['startup-folder', fileName]),
            name: basename(fileName).replace(/\.(lnk|exe|bat|cmd)$/i, ''),
            location: disabledPath,
            source: 'Startup folder',
            sourceKind: 'startup-folder',
            enabled: false,
            canToggle: true,
            impact: classifyStartupImpact(fileName)
          }
        }
      }

      if (!(await pathExists(disabledPath))) {
        return { success: false, error: 'Disabled startup shortcut not found' }
      }
      await rename(disabledPath, activePath)
      log.info('Enabled startup folder item', fileName)
      return {
        success: true,
        entry: {
          id: encodeId(['startup-folder', fileName]),
          name: basename(fileName).replace(/\.(lnk|exe|bat|cmd)$/i, ''),
          location: activePath,
          source: 'Startup folder',
          sourceKind: 'startup-folder',
          enabled: true,
          canToggle: true,
          impact: classifyStartupImpact(fileName)
        }
      }
    } catch (err) {
      log.error('Startup folder toggle failed', fileName, err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to move startup shortcut'
      }
    }
  }
}

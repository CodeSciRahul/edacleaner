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

const HKCU_RUN = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const HKCU_RUN_WOW = 'HKCU\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
const HKLM_RUN = 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const HKLM_RUN_WOW = 'HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'

const APPROVED_RUN =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
const APPROVED_FOLDER =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'
const APPROVED_TASK =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupTask'
const APPROVED_RUN_HKLM =
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'

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

function commonStartupDir(): string {
  return join(
    process.env.PROGRAMDATA ?? 'C:\\ProgramData',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'StartUp'
  )
}

function disabledStartupDir(): string {
  return join(userStartupDir(), 'EDACleanerDisabled')
}

/** Parse `reg query` value lines; names may contain spaces. */
function parseRegQuery(stdout: string): Array<{ name: string; command: string }> {
  const rows: Array<{ name: string; command: string }> = []
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(
      /^\s+(.+?)\s+(REG_(?:SZ|EXPAND_SZ|MULTI_SZ|DWORD|QWORD|NONE))\s+(.*)$/i
    )
    if (!match) continue
    const name = match[1].trim()
    if (!name || name === '(Default)' || name === '<NO NAME>') continue
    rows.push({ name, command: match[3].trim() })
  }
  return rows
}

/** Parse StartupApproved REG_BINARY rows → enabled flag (2/0 = on, 3 = off). */
function parseApprovedBinary(stdout: string): Map<string, boolean> {
  const map = new Map<string, boolean>()
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^\s+(.+?)\s+REG_BINARY\s+([0-9A-Fa-f]{2}(?:\s+[0-9A-Fa-f]{2})*)\s*$/i)
    if (!match) continue
    const name = match[1].trim()
    if (!name || name.startsWith('PS')) continue
    const hex = match[2].replace(/\s+/g, '')
    if (hex.length < 2) continue
    const status = parseInt(hex.slice(0, 2), 16)
    // Windows Settings: 0x02 enabled, 0x03 disabled; 0x00 treated as enabled
    // Keep original casing — required to toggle the same registry value.
    map.set(name, status === 0x02 || status === 0x00)
  }
  return map
}

async function queryRegValues(key: string): Promise<Array<{ name: string; command: string }>> {
  try {
    const { stdout } = await runCommand('reg', ['query', key], { timeoutMs: 10_000 })
    return parseRegQuery(stdout)
  } catch {
    return []
  }
}

async function queryApprovedMap(key: string): Promise<Map<string, boolean>> {
  try {
    const { stdout } = await runCommand('reg', ['query', key], { timeoutMs: 10_000 })
    return parseApprovedBinary(stdout)
  } catch {
    return new Map()
  }
}

function approvedEnabled(
  map: Map<string, boolean>,
  name: string,
  fallback: boolean
): boolean {
  const exact = map.get(name)
  if (exact !== undefined) return exact
  const lower = name.toLowerCase()
  for (const [key, value] of map) {
    if (key.toLowerCase() === lower) return value
  }
  return fallback
}

function approvedOriginalName(map: Map<string, boolean>, name: string): string | undefined {
  if (map.has(name)) return name
  const lower = name.toLowerCase()
  for (const key of map.keys()) {
    if (key.toLowerCase() === lower) return key
  }
  return undefined
}

function friendlyTaskName(raw: string): string {
  // UWP: "WhatsAppDesktop_..._WhatsAppDesktop" or package_taskId
  const cleaned = raw.replace(/_[a-z0-9]{13,}(_|$)/gi, '_').replace(/_+/g, ' ').trim()
  if (cleaned.length >= 3 && cleaned.length < raw.length) return cleaned
  const parts = raw.split('_').filter(Boolean)
  if (parts.length >= 2) {
    const last = parts[parts.length - 1]
    if (last.length > 2 && !/^[a-z0-9]{13,}$/i.test(last)) return last
    return parts[0]
  }
  return raw
}

interface ScheduledTaskRow {
  name: string
  path: string
  enabled: boolean
  action: string
}

async function listLogonScheduledTasks(): Promise<ScheduledTaskRow[]> {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$rows = @()
Get-ScheduledTask | ForEach-Object {
  $task = $_
  $path = $task.TaskPath
  if ($path -like '\\Microsoft\\Windows\\*') { return }
  if ($path -like '\\Microsoft\\Office\\*') { return }
  $hasLogon = $false
  foreach ($trig in @($task.Triggers)) {
    $cn = $trig.CimClass.CimClassName
    if ($cn -match 'LogonTrigger|BootTrigger') { $hasLogon = $true; break }
  }
  if (-not $hasLogon) { return }
  $action = ''
  foreach ($a in @($task.Actions)) {
    if ($a.Execute) { $action = ($a.Execute + ' ' + $a.Arguments).Trim(); break }
  }
  $rows += [pscustomobject]@{
    name = $task.TaskName
    path = $path
    enabled = ($task.State -ne 'Disabled')
    action = $action
  }
}
$rows | ConvertTo-Json -Compress
`.trim()

  try {
    const { stdout } = await runCommand(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeoutMs: 45_000 }
    )
    const text = stdout.trim()
    if (!text) return []
    const parsed = JSON.parse(text) as ScheduledTaskRow | ScheduledTaskRow[]
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch (err) {
    log.warn('Scheduled task list failed', err instanceof Error ? err.message : err)
    return []
  }
}

async function setApprovedEnabled(key: string, valueName: string, enabled: boolean): Promise<void> {
  const statusByte = enabled ? '02' : '03'
  // 12-byte blob: status DWORD + FILETIME (zeros fine for Settings compatibility)
  const hex = `${statusByte}0000000000000000000000`
  await runCommand(
    'reg',
    ['add', key, '/v', valueName, '/t', 'REG_BINARY', '/d', hex, '/f'],
    { timeoutMs: 10_000 }
  )
}

export class WindowsStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'win32' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []
    const seenIds = new Set<string>()
    const seenNames = new Set<string>()
    const pushUnique = (entry: StartupAppEntry): void => {
      if (seenIds.has(entry.id)) return
      seenIds.add(entry.id)
      seenNames.add(entry.name.toLowerCase())
      entries.push(entry)
    }

    const [approvedRun, approvedFolder, approvedTask, approvedRunHklm] = await Promise.all([
      queryApprovedMap(APPROVED_RUN),
      queryApprovedMap(APPROVED_FOLDER),
      queryApprovedMap(APPROVED_TASK),
      queryApprovedMap(APPROVED_RUN_HKLM)
    ])

    const enabledHkcuNames = new Set<string>()

    const addRegistryRun = async (
      key: string,
      opts: {
        idPrefix: string
        source: string
        sourceKind: 'registry-hkcu' | 'registry-hklm'
        canToggle: boolean
        trackHkcu?: boolean
        approved: Map<string, boolean>
        protectedReason?: string
      }
    ): Promise<void> => {
      const rows = await queryRegValues(key)
      for (const row of rows) {
        if (opts.trackHkcu) enabledHkcuNames.add(row.name.toLowerCase())
        const protectedReason =
          opts.protectedReason ?? isProtectedStartupName(row.name) ?? undefined
        const enabled = approvedEnabled(opts.approved, row.name, true)
        pushUnique({
          id: encodeId([opts.idPrefix, row.name]),
          name: row.name,
          location: row.command,
          source: opts.source,
          sourceKind: opts.sourceKind,
          enabled,
          canToggle: opts.canToggle && !protectedReason,
          impact: classifyStartupImpact(row.name),
          details: `Registry: ${key}\\${row.name}`,
          protectedReason:
            protectedReason ??
            (opts.canToggle ? undefined : 'Machine-wide registry key is read-only')
        })
      }
    }

    await addRegistryRun(HKCU_RUN, {
      idPrefix: 'hkcu-run',
      source: 'Current User Run (Registry)',
      sourceKind: 'registry-hkcu',
      canToggle: true,
      trackHkcu: true,
      approved: approvedRun
    })

    await addRegistryRun(HKCU_RUN_WOW, {
      idPrefix: 'hkcu-run-wow',
      source: 'Current User Run 32-bit (Registry)',
      sourceKind: 'registry-hkcu',
      canToggle: true,
      trackHkcu: true,
      approved: approvedRun
    })

    // Disabled backups (HKCU) — skip names still present in Run
    try {
      const rows = await queryRegValues(BACKUP_REG_KEY)
      for (const row of rows) {
        if (enabledHkcuNames.has(row.name.toLowerCase())) continue
        pushUnique({
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
      // Backup key may not exist
    }

    await addRegistryRun(HKLM_RUN, {
      idPrefix: 'hklm-run',
      source: 'All Users Run (Registry)',
      sourceKind: 'registry-hklm',
      canToggle: false,
      approved: approvedRunHklm.size > 0 ? approvedRunHklm : approvedRun,
      protectedReason: 'Machine-wide registry key (HKLM) is read-only'
    })

    await addRegistryRun(HKLM_RUN_WOW, {
      idPrefix: 'hklm-run-wow',
      source: 'All Users Run 32-bit (Registry)',
      sourceKind: 'registry-hklm',
      canToggle: false,
      approved: approvedRunHklm.size > 0 ? approvedRunHklm : approvedRun,
      protectedReason: 'Machine-wide registry key (HKLM) is read-only'
    })

    // Orphan StartupApproved\Run entries (e.g. Discord) still shown in Windows Settings
    // even when the Run value was removed.
    for (const [rawName, enabled] of approvedRun) {
      if (seenNames.has(rawName.toLowerCase())) continue
      const protectedReason = isProtectedStartupName(rawName)
      pushUnique({
        id: encodeId(['hkcu-run', rawName]),
        name: rawName,
        location: '',
        source: 'Current User Run (Registry)',
        sourceKind: 'registry-hkcu',
        enabled,
        canToggle: !protectedReason,
        impact: classifyStartupImpact(rawName),
        details: `Listed in StartupApproved\\Run (no active Run value)`,
        protectedReason: protectedReason ?? undefined
      })
    }

    // User Startup folder
    const enabledFolderFiles = new Set<string>()
    const startupDir = userStartupDir()
    if (await pathExists(startupDir)) {
      try {
        const files = await readdir(startupDir)
        for (const file of files) {
          if (file === 'EDACleanerDisabled' || file.startsWith('.')) continue
          enabledFolderFiles.add(file.toLowerCase())
          const fullPath = join(startupDir, file)
          const name = file.replace(/\.(lnk|exe|bat|cmd)$/i, '')
          const protectedReason = isProtectedStartupName(name)
          pushUnique({
            id: encodeId(['startup-folder', file]),
            name,
            location: fullPath,
            source: 'Startup folder',
            sourceKind: 'startup-folder',
            enabled: approvedEnabled(approvedFolder, file, true),
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

    // Disabled Startup folder items (EDA backup)
    const disabledDir = disabledStartupDir()
    if (await pathExists(disabledDir)) {
      try {
        const files = await readdir(disabledDir)
        for (const file of files) {
          if (file.startsWith('.')) continue
          if (enabledFolderFiles.has(file.toLowerCase())) continue
          const fullPath = join(disabledDir, file)
          const name = file.replace(/\.(lnk|exe|bat|cmd)$/i, '')
          pushUnique({
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

    // Common (All Users) Startup folder — view / toggle best-effort
    const commonDir = commonStartupDir()
    if (await pathExists(commonDir)) {
      try {
        const files = await readdir(commonDir)
        for (const file of files) {
          if (file.startsWith('.')) continue
          const fullPath = join(commonDir, file)
          const name = file.replace(/\.(lnk|exe|bat|cmd)$/i, '')
          pushUnique({
            id: encodeId(['common-startup-folder', file]),
            name,
            location: fullPath,
            source: 'Common Startup folder',
            sourceKind: 'startup-folder',
            enabled: approvedEnabled(approvedFolder, file, true),
            canToggle: false,
            impact: classifyStartupImpact(name),
            details: fullPath,
            protectedReason: 'All-users Startup folder requires administrator rights'
          })
        }
      } catch (err) {
        log.warn('Common Startup folder list failed', err instanceof Error ? err.message : err)
      }
    }

    // UWP / Store StartupTasks (WhatsApp, etc.) via StartupApproved\StartupTask
    for (const [rawName, enabled] of approvedTask) {
      const display = friendlyTaskName(rawName)
      if (seenNames.has(display.toLowerCase()) || seenNames.has(rawName.toLowerCase())) continue
      const protectedReason = isProtectedStartupName(display)
      pushUnique({
        id: encodeId(['uwp-task', rawName]),
        name: display,
        location: rawName,
        source: 'App startup task',
        sourceKind: 'uwp-startup-task',
        enabled,
        canToggle: !protectedReason,
        impact: classifyStartupImpact(display),
        details: `StartupApproved\\StartupTask\\${rawName}`,
        protectedReason: protectedReason ?? undefined
      })
    }

    // Logon / boot scheduled tasks (many chat apps register here)
    const tasks = await listLogonScheduledTasks()
    for (const task of tasks) {
      const fullId = `${task.path}${task.name}`.replace(/\\+/g, '\\')
      const display = task.name
      if (seenNames.has(display.toLowerCase())) continue
      // Skip if action path already listed as a Run command
      const actionLower = (task.action || '').toLowerCase()
      const duplicateCommand = entries.some((e) => {
        const loc = e.location.toLowerCase()
        return actionLower && (loc.includes(actionLower) || actionLower.includes(loc.split(' ')[0]))
      })
      if (duplicateCommand) continue

      const protectedReason = isProtectedStartupName(display)
      const isMicrosoft = /microsoft/i.test(task.path) || /microsoft/i.test(task.action)
      pushUnique({
        id: encodeId(['schtask', task.path, task.name]),
        name: display,
        location: task.action || fullId,
        source: 'Task Scheduler (Logon)',
        sourceKind: 'scheduled-task',
        enabled: task.enabled,
        canToggle: !protectedReason && !isMicrosoft,
        impact: classifyStartupImpact(display),
        details: `Scheduled task: ${fullId}`,
        protectedReason:
          protectedReason ??
          (isMicrosoft ? 'Microsoft scheduled task is protected' : undefined)
      })
    }

    return entries
  }

  async setEnabled(id: string, enabled: boolean): Promise<StartupMutationResult> {
    const parts = decodeId(id)
    if (parts.length < 2) {
      return { success: false, error: 'Invalid startup entry id' }
    }

    const [kind, ...rest] = parts

    if (kind === 'hklm-run' || kind === 'hklm-run-wow' || kind === 'common-startup-folder') {
      return {
        success: false,
        error: 'Cannot modify machine-wide startup entries without administrator rights'
      }
    }

    if (kind === 'hkcu-run' || kind === 'hkcu-run-wow') {
      const valueName = rest.join('::')
      const runKey = kind === 'hkcu-run-wow' ? HKCU_RUN_WOW : HKCU_RUN
      return this.setRegistryEnabled(valueName, enabled, runKey, kind)
    }

    if (kind === 'startup-folder') {
      return this.setFolderEnabled(rest.join('::'), enabled)
    }

    if (kind === 'uwp-task') {
      return this.setUwpTaskEnabled(rest.join('::'), enabled)
    }

    if (kind === 'schtask') {
      const taskPath = rest[0] ?? '\\'
      const taskName = rest.slice(1).join('::')
      return this.setScheduledTaskEnabled(taskPath, taskName, enabled)
    }

    return { success: false, error: 'Unsupported startup entry type' }
  }

  private async setRegistryEnabled(
    valueName: string,
    enabled: boolean,
    runKey: string,
    idPrefix: string
  ): Promise<StartupMutationResult> {
    const protectedReason = isProtectedStartupName(valueName)
    if (protectedReason) {
      return { success: false, error: protectedReason }
    }

    try {
      // Prefer StartupApproved toggle when the Run value still exists (matches Windows Settings)
      const rows = await queryRegValues(runKey)
      const active = rows.find((r) => r.name.toLowerCase() === valueName.toLowerCase())

      if (active) {
        const approvedName =
          approvedOriginalName(await queryApprovedMap(APPROVED_RUN), valueName) ?? valueName
        await setApprovedEnabled(APPROVED_RUN, approvedName, enabled)
        // Keep backup key clean if re-enabling via Approved
        if (enabled) {
          try {
            await runCommand('reg', ['delete', BACKUP_REG_KEY, '/v', valueName, '/f'], {
              timeoutMs: 10_000
            })
          } catch {
            // ignore
          }
        }
        log.info('Toggled HKCU Run via StartupApproved', valueName, enabled)
        return {
          success: true,
          entry: {
            id: encodeId([idPrefix, valueName]),
            name: valueName,
            location: active.command,
            source:
              idPrefix === 'hkcu-run-wow'
                ? 'Current User Run 32-bit (Registry)'
                : 'Current User Run (Registry)',
            sourceKind: 'registry-hkcu',
            enabled,
            canToggle: true,
            impact: classifyStartupImpact(valueName)
          }
        }
      }

      // Approved-only orphan (e.g. Discord still listed in Settings after Run value removed)
      const approvedMap = await queryApprovedMap(APPROVED_RUN)
      const approvedName = approvedOriginalName(approvedMap, valueName)
      if (approvedName) {
        await setApprovedEnabled(APPROVED_RUN, approvedName, enabled)
        log.info('Toggled orphan StartupApproved Run entry', approvedName, enabled)
        return {
          success: true,
          entry: {
            id: encodeId([idPrefix, approvedName]),
            name: approvedName,
            location: '',
            source: 'Current User Run (Registry)',
            sourceKind: 'registry-hkcu',
            enabled,
            canToggle: true,
            impact: classifyStartupImpact(approvedName),
            details: 'Listed in StartupApproved\\Run (no active Run value)'
          }
        }
      }

      // Fallback: delete/restore Run value (legacy EDA backup flow)
      if (!enabled) {
        const { stdout } = await runCommand('reg', ['query', runKey, '/v', valueName], {
          timeoutMs: 10_000
        })
        const parsed = parseRegQuery(stdout)
        const row = parsed.find((r) => r.name === valueName) ?? parsed[0]
        if (!row?.command) {
          // Maybe already removed — try Approved only
          await setApprovedEnabled(APPROVED_RUN, valueName, false)
          return {
            success: true,
            entry: {
              id: encodeId([idPrefix, valueName]),
              name: valueName,
              location: '',
              source: 'Current User Run (Registry)',
              sourceKind: 'registry-hkcu',
              enabled: false,
              canToggle: true,
              impact: classifyStartupImpact(valueName)
            }
          }
        }

        await runCommand(
          'reg',
          ['add', BACKUP_REG_KEY, '/v', valueName, '/t', 'REG_SZ', '/d', row.command, '/f'],
          { timeoutMs: 10_000 }
        )
        await runCommand('reg', ['delete', runKey, '/v', valueName, '/f'], {
          timeoutMs: 10_000
        })
        await setApprovedEnabled(APPROVED_RUN, valueName, false)

        log.info('Disabled HKCU Run entry', valueName)
        return {
          success: true,
          entry: {
            id: encodeId([idPrefix, valueName]),
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
      await setApprovedEnabled(APPROVED_RUN, valueName, true)

      log.info('Enabled HKCU Run entry', valueName)
      return {
        success: true,
        entry: {
          id: encodeId([idPrefix, valueName]),
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
      // Prefer StartupApproved when the shortcut is still in the Startup folder
      if (await pathExists(activePath)) {
        await setApprovedEnabled(APPROVED_FOLDER, fileName, enabled)
        if (!enabled) {
          // Also move aside so older Windows builds honor disable
          await mkdir(disabledDir, { recursive: true })
          await rename(activePath, disabledPath)
        }
        log.info('Toggled startup folder item', fileName, enabled)
        return {
          success: true,
          entry: {
            id: encodeId(['startup-folder', fileName]),
            name: basename(fileName).replace(/\.(lnk|exe|bat|cmd)$/i, ''),
            location: enabled ? activePath : disabledPath,
            source: 'Startup folder',
            sourceKind: 'startup-folder',
            enabled,
            canToggle: true,
            impact: classifyStartupImpact(fileName)
          }
        }
      }

      await mkdir(disabledDir, { recursive: true })

      if (!enabled) {
        return { success: false, error: 'Startup shortcut not found' }
      }

      if (!(await pathExists(disabledPath))) {
        return { success: false, error: 'Disabled startup shortcut not found' }
      }
      await rename(disabledPath, activePath)
      await setApprovedEnabled(APPROVED_FOLDER, fileName, true)
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

  private async setUwpTaskEnabled(
    taskKey: string,
    enabled: boolean
  ): Promise<StartupMutationResult> {
    const display = friendlyTaskName(taskKey)
    const protectedReason = isProtectedStartupName(display)
    if (protectedReason) {
      return { success: false, error: protectedReason }
    }

    try {
      // Registry value name must match the exact StartupApproved key
      await setApprovedEnabled(APPROVED_TASK, taskKey, enabled)
      log.info('Toggled UWP startup task', taskKey, enabled)
      return {
        success: true,
        entry: {
          id: encodeId(['uwp-task', taskKey]),
          name: display,
          location: taskKey,
          source: 'App startup task',
          sourceKind: 'uwp-startup-task',
          enabled,
          canToggle: true,
          impact: classifyStartupImpact(display)
        }
      }
    } catch (err) {
      log.error('UWP startup task toggle failed', taskKey, err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update app startup task'
      }
    }
  }

  private async setScheduledTaskEnabled(
    taskPath: string,
    taskName: string,
    enabled: boolean
  ): Promise<StartupMutationResult> {
    const protectedReason = isProtectedStartupName(taskName)
    if (protectedReason) {
      return { success: false, error: protectedReason }
    }

    const cmd = enabled ? 'Enable-ScheduledTask' : 'Disable-ScheduledTask'
    const script = `${cmd} -TaskName ${JSON.stringify(taskName)} -TaskPath ${JSON.stringify(taskPath)} -ErrorAction Stop | Out-Null`

    try {
      await runCommand(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { timeoutMs: 20_000 }
      )
      log.info('Toggled scheduled task', taskPath, taskName, enabled)
      return {
        success: true,
        entry: {
          id: encodeId(['schtask', taskPath, taskName]),
          name: taskName,
          location: `${taskPath}${taskName}`,
          source: 'Task Scheduler (Logon)',
          sourceKind: 'scheduled-task',
          enabled,
          canToggle: true,
          impact: classifyStartupImpact(taskName)
        }
      }
    } catch (err) {
      log.error('Scheduled task toggle failed', taskName, err)
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to update scheduled task (may need administrator rights)'
      }
    }
  }
}

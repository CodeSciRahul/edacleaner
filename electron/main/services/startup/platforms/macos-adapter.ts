import { homedir } from 'os'
import { basename, dirname, join } from 'path'
import { access, mkdir, rename, readdir, readFile, writeFile } from 'fs/promises'
import type { StartupAppEntry, StartupMutationResult } from '@shared/interfaces'
import type { PlatformStartupAdapter } from './platform-adapter'
import {
  classifyStartupImpact,
  decodeId,
  encodeId,
  isProtectedStartupName
} from './startup-safety'
import { runCommand } from '@main/services/boost/platforms/exec-utils'
import { openSystemStartupSettings } from '@main/services/startup/open-system-startup'
import { createLogger } from '@main/utils/logger'

const log = createLogger('startup:mac')

/** Shown for SMAppService / Background Items. macOS does not let another app flip that switch. */
const BTM_LOCKED_REASON =
  'macOS keeps this switch in System Settings → General → Login Items. EDA Cleaner cannot change that switch.'

const LIST_LOGIN_ITEMS_SCRIPT = `
tell application "System Events"
  set output to ""
  repeat with i in login items
    set itemName to name of i
    set itemPath to ""
    try
      set itemPath to POSIX path of (path of i as alias)
    end try
    if itemPath is "" then
      try
        set itemPath to path of i as text
      end try
    end if
    set itemHidden to "false"
    try
      if hidden of i then set itemHidden to "true"
    end try
    set output to output & itemName & tab & itemPath & tab & itemHidden & linefeed
  end repeat
  return output
end tell
`.trim()

const DELETE_LOGIN_ITEM_SCRIPT = `
on run argv
  set itemName to item 1 of argv
  tell application "System Events"
    delete login item itemName
  end tell
end run
`.trim()

const ADD_LOGIN_ITEM_SCRIPT = `
on run argv
  set itemPath to item 1 of argv
  set itemHidden to false
  if (count of argv) > 1 then
    if item 2 of argv is "true" then set itemHidden to true
  end if
  tell application "System Events"
    make login item at end with properties {path:itemPath, hidden:itemHidden}
  end tell
end run
`.trim()

interface SavedLoginItem {
  name: string
  path: string
  hidden: boolean
}

/** Rows from System Events: `name<tab>path<tab>true|false`. */
export function parseLoginItemsOutput(
  stdout: string
): Array<{ name: string; path: string; hidden: boolean }> {
  const items: Array<{ name: string; path: string; hidden: boolean }> = []
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.includes('\t')) continue
    const [name, path, hidden] = trimmed.split('\t')
    if (!name || !path) continue
    items.push({ name, path, hidden: hidden === 'true' })
  }
  return items
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function userAgentsDir(): string {
  return join(homedir(), 'Library', 'LaunchAgents')
}

function systemAgentsDir(): string {
  return join('/Library', 'LaunchAgents')
}

interface InstalledAppInfo {
  name: string
  path: string
}

/**
 * Scan /Applications and ~/Applications to index bundle IDs and app names.
 * Runs in under 5ms, requires zero admin privileges or authorization prompts.
 */
async function indexInstalledApplications(): Promise<Map<string, InstalledAppInfo>> {
  const map = new Map<string, InstalledAppInfo>()
  const appDirs = ['/Applications', join(homedir(), 'Applications')]

  for (const dir of appDirs) {
    if (!(await pathExists(dir))) continue
    try {
      const files = await readdir(dir)
      for (const file of files) {
        if (!file.endsWith('.app')) continue
        const fullPath = join(dir, file)
        const infoPlist = join(fullPath, 'Contents', 'Info.plist')
        if (!(await pathExists(infoPlist))) continue

        try {
          const content = await readFile(infoPlist, 'utf-8')
          const idMatch = content.match(
            /<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/
          )
          const nameMatch =
            content.match(/<key>CFBundleDisplayName<\/key>\s*<string>([^<]+)<\/string>/) ||
            content.match(/<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/)
          const name = nameMatch ? nameMatch[1].trim() : file.replace(/\.app$/i, '')
          const appInfo: InstalledAppInfo = { name, path: fullPath }

          if (idMatch) {
            map.set(idMatch[1].trim().toLowerCase(), appInfo)
          }
          map.set(file.replace(/\.app$/i, '').toLowerCase(), appInfo)
        } catch {
          // ignore unreadable plists
        }
      }
    } catch {
      // ignore
    }
  }

  return map
}

async function disabledLoginItemsPath(): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app && typeof app.getPath === 'function') {
      const dir = app.getPath('userData')
      await mkdir(dir, { recursive: true })
      return join(dir, 'disabled-login-items.json')
    }
  } catch {
    // electron unavailable
  }
  const dir = join(homedir(), '.edacleaner')
  await mkdir(dir, { recursive: true })
  return join(dir, 'disabled-login-items.json')
}

async function readDisabledLoginItems(): Promise<SavedLoginItem[]> {
  try {
    const path = await disabledLoginItemsPath()
    if (!(await pathExists(path))) return []
    const raw = JSON.parse(await readFile(path, 'utf8')) as SavedLoginItem[]
    if (!Array.isArray(raw)) return []
    return raw.filter(
      (item) => item && typeof item.name === 'string' && typeof item.path === 'string'
    )
  } catch {
    return []
  }
}

async function writeDisabledLoginItems(items: SavedLoginItem[]): Promise<void> {
  const path = await disabledLoginItemsPath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(items, null, 2), 'utf8')
}

async function openLoginItemsSettings(): Promise<void> {
  try {
    await openSystemStartupSettings()
  } catch (err) {
    log.warn('Could not open Login Items settings', err)
  }
}

function loginItemEntry(
  item: { name: string; path: string; hidden: boolean },
  enabled: boolean
): StartupAppEntry {
  const protectedReason = isProtectedStartupName(item.name)
  return {
    id: encodeId(['login-item', item.name, item.path, item.hidden ? '1' : '0']),
    name: item.name,
    location: item.path,
    source: 'Open at Login',
    sourceKind: 'other',
    enabled,
    canToggle: !protectedReason,
    impact: classifyStartupImpact(item.name),
    details: enabled
      ? 'Shown in System Settings → General → Login Items'
      : 'Removed from System Settings → General → Login Items. Turn this on to add it back.',
    protectedReason: protectedReason ?? undefined
  }
}

/**
 * Login items System Settings shows under Open at Login.
 * Adding and removing them here updates that page.
 */
async function listLoginItems(): Promise<StartupAppEntry[]> {
  if (process.env.VITEST === 'true') return []

  let live: Array<{ name: string; path: string; hidden: boolean }> = []
  try {
    const { stdout } = await runCommand('osascript', ['-e', LIST_LOGIN_ITEMS_SCRIPT], {
      timeoutMs: 8000
    })
    live = parseLoginItemsOutput(stdout)
  } catch (err) {
    log.warn('Login items list failed', err instanceof Error ? err.message : err)
  }

  const liveNames = new Set(live.map((item) => item.name.toLowerCase()))
  const saved = await readDisabledLoginItems()
  const stillDisabled = saved.filter((item) => !liveNames.has(item.name.toLowerCase()))
  if (stillDisabled.length !== saved.length) {
    try {
      await writeDisabledLoginItems(stillDisabled)
    } catch (err) {
      log.warn('Could not update disabled login items', err)
    }
  }

  return [
    ...live.map((item) => loginItemEntry(item, true)),
    ...stillDisabled.map((item) => loginItemEntry(item, false))
  ]
}

async function setLoginItemEnabled(
  name: string,
  itemPath: string,
  hidden: boolean,
  enabled: boolean,
  id: string
): Promise<StartupMutationResult> {
  const protectedReason = isProtectedStartupName(name)
  if (protectedReason) return { success: false, error: protectedReason }
  if (!itemPath) return { success: false, error: 'Login item path is missing' }

  try {
    if (!enabled) {
      await runCommand('osascript', ['-e', DELETE_LOGIN_ITEM_SCRIPT, name], { timeoutMs: 8000 })
      const saved = await readDisabledLoginItems()
      const next = saved.filter((item) => item.name.toLowerCase() !== name.toLowerCase())
      next.push({ name, path: itemPath, hidden })
      await writeDisabledLoginItems(next)
    } else {
      await runCommand(
        'osascript',
        ['-e', ADD_LOGIN_ITEM_SCRIPT, itemPath, hidden ? 'true' : 'false'],
        { timeoutMs: 8000 }
      )
      const saved = await readDisabledLoginItems()
      await writeDisabledLoginItems(
        saved.filter((item) => item.name.toLowerCase() !== name.toLowerCase())
      )
    }

    log.info('Updated login item', name, enabled)
    return {
      success: true,
      entry: { ...loginItemEntry({ name, path: itemPath, hidden }, enabled), id }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update login item'
    const denied = /1743|not authorized|not permitted|automation/i.test(message)
    log.error('Login item toggle failed', err)
    return {
      success: false,
      error: denied
        ? 'macOS blocked EDA Cleaner from changing login items. Allow EDA Cleaner under System Settings → Privacy & Security → Automation → System Events, then try again.'
        : message
    }
  }
}

/**
 * Lists modern macOS Background Task Management / SMAppService items without
 * using `sfltool dumpbtm` (which requires admin privileges and prompts the user).
 * These switches live in System Settings and cannot be changed by another app.
 */
async function listModernServices(
  installedApps: Map<string, InstalledAppInfo>
): Promise<StartupAppEntry[]> {
  const entries: StartupAppEntry[] = []
  const uid = typeof process.getuid === 'function' ? process.getuid() : 501

  try {
    const { stdout: disOut } = await runCommand(
      'launchctl',
      ['print-disabled', `gui/${uid}`],
      { timeoutMs: 5000 }
    )

    for (const line of disOut.split('\n')) {
      const match = line.match(/"([^"]+)"\s*=>\s*(enabled|disabled)/)
      if (!match) continue

      const serviceName = match[1]
      const isEnabled = match[2] === 'enabled'

      // Skip internal Apple system services
      if (serviceName.startsWith('com.apple.')) continue

      // Resolve parent app name and location
      let foundApp: InstalledAppInfo | undefined
      const parts = serviceName.split('.')

      for (let i = parts.length; i >= 2; i--) {
        const candidate = parts.slice(0, i).join('.').toLowerCase()
        if (installedApps.has(candidate)) {
          foundApp = installedApps.get(candidate)
          break
        }
      }

      if (!foundApp) {
        const lower = serviceName.toLowerCase()
        for (const [key, app] of installedApps.entries()) {
          if (lower.includes(key) && key.length >= 4) {
            foundApp = app
            break
          }
        }
      }

      const displayName = foundApp?.name || serviceName
      const appPath = foundApp?.path || serviceName
      const protectedReason =
        isProtectedStartupName(displayName) ?? isProtectedStartupName(serviceName)

      entries.push({
        id: encodeId(['btm-service', serviceName, displayName, appPath]),
        name: displayName,
        location: appPath,
        source: 'Background Items',
        sourceKind: 'launch-agent',
        enabled: isEnabled,
        canToggle: false,
        impact: classifyStartupImpact(displayName),
        details:
          'Controlled in System Settings → General → Login Items. That switch is the one macOS uses.',
        protectedReason: protectedReason ?? BTM_LOCKED_REASON
      })
    }
  } catch (err) {
    log.debug('launchctl print-disabled failed', err)
  }

  return entries
}

/**
 * Lists macOS startup items from:
 * 1. Open at Login items (System Settings reflects these)
 * 2. Background items (System Settings only — view only here)
 * 3. User LaunchAgents (~/Library/LaunchAgents)
 * 4. System LaunchAgents (/Library/LaunchAgents)
 */
export class MacosStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'darwin' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []
    const seenNames = new Set<string>()

    // Index installed applications for friendly name resolution
    const installedApps = await indexInstalledApplications()

    // 1. Open at Login — the list System Settings actually toggles
    const loginItems = await listLoginItems()
    for (const item of loginItems) {
      entries.push(item)
      seenNames.add(item.name.toLowerCase())
    }

    // 2. Modern background services (Teams, Docker, etc.)
    const modernItems = await listModernServices(installedApps)
    for (const item of modernItems) {
      entries.push(item)
      seenNames.add(item.name.toLowerCase())
    }

    // 2. User LaunchAgents (~/Library/LaunchAgents)
    const userDir = userAgentsDir()
    if (await pathExists(userDir)) {
      try {
        const files = await readdir(userDir)
        for (const file of files) {
          const isDisabled = file.endsWith('.disabled')
          const baseName = isDisabled ? file.replace(/\.disabled$/i, '') : file
          if (!baseName.endsWith('.plist')) continue

          const rawName = baseName.replace(/\.plist$/i, '')
          // Resolve friendly name if available
          const found = installedApps.get(rawName.toLowerCase())
          const name = found?.name || rawName

          if (seenNames.has(name.toLowerCase())) continue
          seenNames.add(name.toLowerCase())

          const protectedReason = isProtectedStartupName(name)
          const fullPath = join(userDir, file)

          entries.push({
            id: encodeId(['launch-agent', baseName]),
            name,
            location: found?.path || fullPath,
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
        log.warn('User LaunchAgents list failed', err instanceof Error ? err.message : err)
      }
    }

    // 3. System-wide LaunchAgents (/Library/LaunchAgents)
    const sysDir = systemAgentsDir()
    if (await pathExists(sysDir)) {
      try {
        const files = await readdir(sysDir)
        for (const file of files) {
          if (!file.endsWith('.plist')) continue
          const rawName = file.replace(/\.plist$/i, '')
          const found = installedApps.get(rawName.toLowerCase())
          const name = found?.name || rawName

          if (seenNames.has(name.toLowerCase())) continue
          seenNames.add(name.toLowerCase())

          const protectedReason = isProtectedStartupName(name)
          const fullPath = join(sysDir, file)

          entries.push({
            id: encodeId(['system-launch-agent', file]),
            name,
            location: found?.path || fullPath,
            source: 'System LaunchAgents',
            sourceKind: 'launch-agent',
            enabled: true,
            canToggle: false,
            impact: classifyStartupImpact(name),
            details: fullPath,
            protectedReason:
              protectedReason ?? 'System LaunchAgents require administrator permissions'
          })
        }
      } catch (err) {
        log.warn('System LaunchAgents list failed', err instanceof Error ? err.message : err)
      }
    }

    return entries
  }

  async setEnabled(id: string, enabled: boolean): Promise<StartupMutationResult> {
    const parts = decodeId(id)
    if (parts.length < 2) {
      return { success: false, error: 'Invalid startup entry id' }
    }

    const kind = parts[0]

    if (kind === 'login-item') {
      const name = parts[1] ?? ''
      const itemPath = parts[2] ?? ''
      const hidden = parts[3] === '1'
      return setLoginItemEnabled(name, itemPath, hidden, enabled, id)
    }

    // Background Items in System Settings are not writable by another app.
    // launchctl enable/disable changes a different database, so the Settings switch stays put.
    if (kind === 'btm-service') {
      await openLoginItemsSettings()
      return {
        success: false,
        error:
          'macOS does not let EDA Cleaner change this. System Settings → General → Login Items is open — use the switch there.'
      }
    }

    if (kind === 'system-launch-agent') {
      return {
        success: false,
        error: 'System LaunchAgents cannot be modified without administrator rights'
      }
    }

    if (kind !== 'launch-agent') {
      return { success: false, error: `Unsupported startup item type: ${kind}` }
    }

    const plistName = parts.slice(1).join('::')
    const protectedReason = isProtectedStartupName(plistName)
    if (protectedReason) {
      return { success: false, error: protectedReason }
    }

    const dir = userAgentsDir()
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

import { homedir } from 'os'
import { basename, join } from 'path'
import { access, rename, readdir, readFile } from 'fs/promises'
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

const log = createLogger('startup:mac')

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

/**
 * Lists modern macOS Background Task Management / SMAppService items without
 * using `sfltool dumpbtm` (which requires admin privileges and prompts the user).
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
        canToggle: !protectedReason,
        impact: classifyStartupImpact(displayName),
        details: serviceName !== displayName ? `Service: ${serviceName}` : undefined,
        protectedReason: protectedReason ?? undefined
      })
    }
  } catch (err) {
    log.debug('launchctl print-disabled failed', err)
  }

  return entries
}

/**
 * Lists macOS startup items from:
 * 1. Modern Background Task Management / SMAppService (Microsoft Teams, Docker, etc.)
 * 2. User LaunchAgents (~/Library/LaunchAgents)
 * 3. System LaunchAgents (/Library/LaunchAgents)
 */
export class MacosStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'darwin' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []
    const seenNames = new Set<string>()

    // Index installed applications for friendly name resolution
    const installedApps = await indexInstalledApplications()

    // 1. Modern background services (Teams, Docker, etc.)
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

    // Handle modern BTM services (launchctl enable/disable)
    if (kind === 'btm-service') {
      const serviceName = parts[1]
      const displayName = parts[2] || serviceName
      const appPath = parts[3] || displayName

      const protectedReason =
        isProtectedStartupName(displayName) ?? isProtectedStartupName(serviceName)
      if (protectedReason) {
        return { success: false, error: protectedReason }
      }

      const uid = typeof process.getuid === 'function' ? process.getuid() : 501
      const action = enabled ? 'enable' : 'disable'

      try {
        await runCommand('launchctl', [action, `gui/${uid}/${serviceName}`])
        if (!enabled) {
          try {
            await runCommand('launchctl', ['bootout', `gui/${uid}/${serviceName}`])
          } catch {
            // bootout is best effort
          }
        }
        log.info(`Updated BTM service ${serviceName} to ${action}`)
        return {
          success: true,
          entry: {
            id,
            name: displayName,
            location: appPath,
            source: 'Background Items',
            sourceKind: 'launch-agent',
            enabled,
            canToggle: true,
            impact: classifyStartupImpact(displayName)
          }
        }
      } catch (err) {
        log.error('Failed to toggle BTM service', err)
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Failed to update background service'
        }
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

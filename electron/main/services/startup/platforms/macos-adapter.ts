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

interface BtmParsedApp {
  name: string
  url: string
  developer?: string
}

async function listBtmStartupItems(): Promise<StartupAppEntry[]> {
  const entries: StartupAppEntry[] = []
  const uid = typeof process.getuid === 'function' ? process.getuid() : 501
  const disabledMap = new Map<string, boolean>()

  try {
    const { stdout: disOut } = await runCommand(
      'launchctl',
      ['print-disabled', `gui/${uid}`],
      { timeoutMs: 5000 }
    )
    for (const line of disOut.split('\n')) {
      const match = line.match(/"([^"]+)"\s*=>\s*(enabled|disabled)/)
      if (match) {
        disabledMap.set(match[1], match[2] === 'enabled')
      }
    }
  } catch (err) {
    log.debug('launchctl print-disabled failed', err)
  }

  try {
    const { stdout: btmOut } = await runCommand(
      'sfltool',
      ['dumpbtm'],
      { timeoutMs: 10_000 }
    )
    const chunks = btmOut.split(/(?=\s*#\d+:)/)
    const appsByIdentifier = new Map<string, BtmParsedApp>()

    // Pass 1: Parse parent apps
    for (const chunk of chunks) {
      const nameMatch = chunk.match(/^\s*Name:\s*(.+)$/m)
      const typeMatch = chunk.match(/^\s*Type:\s*(.+)$/m)
      const urlMatch = chunk.match(/^\s*URL:\s*(.+)$/m)
      const idMatch = chunk.match(/^\s*Identifier:\s*(.+)$/m)
      const devMatch = chunk.match(/^\s*Developer Name:\s*(.+)$/m)

      if (!nameMatch || !typeMatch || !idMatch) continue
      const type = typeMatch[1].trim()
      if (type.startsWith('app')) {
        const dev = devMatch ? devMatch[1].trim() : ''
        appsByIdentifier.set(idMatch[1].trim(), {
          name: nameMatch[1].trim(),
          url: urlMatch ? urlMatch[1].trim() : '',
          developer: dev === '(null)' ? undefined : dev
        })
      }
    }

    const seenNames = new Set<string>()

    // Pass 2: Parse background tasks & login items
    for (const chunk of chunks) {
      const nameMatch = chunk.match(/^\s*Name:\s*(.+)$/m)
      const typeMatch = chunk.match(/^\s*Type:\s*(.+)$/m)
      const dispMatch = chunk.match(/^\s*Disposition:\s*\[([^\]]+)\]/m)
      const urlMatch = chunk.match(/^\s*URL:\s*(.+)$/m)
      const idMatch = chunk.match(/^\s*Identifier:\s*(.+)$/m)
      const parentMatch = chunk.match(/^\s*Parent Identifier:\s*(.+)$/m)

      if (!nameMatch || !typeMatch) continue
      const rawName = nameMatch[1].trim()
      const type = typeMatch[1].trim()
      const disp = dispMatch ? dispMatch[1].trim() : ''
      const url = urlMatch ? urlMatch[1].trim() : ''
      const identifier = idMatch ? idMatch[1].trim() : ''
      const parent = parentMatch ? parentMatch[1].trim() : ''

      if (
        url.endsWith('.appex') ||
        url.endsWith('.mdimporter') ||
        rawName.endsWith('.appex') ||
        rawName.endsWith('.mdimporter')
      ) {
        continue
      }

      const isTargetType =
        type.startsWith('agent') ||
        type.startsWith('login item') ||
        type.startsWith('legacy agent') ||
        type.startsWith('background tasks')

      if (!isTargetType) continue

      const parentApp = appsByIdentifier.get(parent)
      let displayName = parentApp?.name || rawName
      if (displayName.endsWith(' - background tasks')) {
        displayName = displayName.replace(' - background tasks', '')
      }

      const dedupeKey = displayName.toLowerCase()
      if (seenNames.has(dedupeKey)) continue
      seenNames.add(dedupeKey)

      const appPath =
        parentApp?.url && parentApp.url.startsWith('/')
          ? parentApp.url
          : url.startsWith('/')
            ? url
            : undefined

      const serviceName = identifier.replace(/^[\d]+\./, '') || rawName

      let isEnabled = !disp.includes('disabled')
      if (disabledMap.has(serviceName)) {
        isEnabled = disabledMap.get(serviceName)!
      }

      const protectedReason =
        isProtectedStartupName(displayName) ?? isProtectedStartupName(serviceName)

      entries.push({
        id: encodeId(['btm-service', serviceName, displayName, appPath ?? '']),
        name: displayName,
        location: appPath ?? serviceName,
        source: 'Background Items',
        sourceKind: 'launch-agent',
        enabled: isEnabled,
        canToggle: !protectedReason,
        impact: classifyStartupImpact(displayName),
        details: parentApp?.developer
          ? `Developer: ${parentApp.developer}`
          : serviceName !== displayName
            ? `Service: ${serviceName}`
            : undefined,
        protectedReason: protectedReason ?? undefined
      })
    }
  } catch (err) {
    log.warn('BTM list failed', err instanceof Error ? err.message : err)
  }

  return entries
}

/**
 * Lists macOS startup items from:
 * 1. User LaunchAgents (~/Library/LaunchAgents)
 * 2. System LaunchAgents (/Library/LaunchAgents)
 * 3. Modern Background Task Management items (sfltool / SMAppService, e.g. Microsoft Teams, Docker)
 */
export class MacosStartupAdapter implements PlatformStartupAdapter {
  readonly platformId = 'darwin' as const

  async listEntries(): Promise<StartupAppEntry[]> {
    const entries: StartupAppEntry[] = []
    const seenNames = new Set<string>()

    // 1. Modern BTM / SMAppService items (Teams, Docker, etc.)
    const btmItems = await listBtmStartupItems()
    for (const item of btmItems) {
      entries.push(item)
      seenNames.add(item.name.toLowerCase())
    }

    // 2. User LaunchAgents
    const userDir = userAgentsDir()
    if (await pathExists(userDir)) {
      try {
        const files = await readdir(userDir)
        for (const file of files) {
          const isDisabled = file.endsWith('.disabled')
          const baseName = isDisabled ? file.replace(/\.disabled$/i, '') : file
          if (!baseName.endsWith('.plist')) continue

          const name = baseName.replace(/\.plist$/i, '')
          if (seenNames.has(name.toLowerCase())) continue
          seenNames.add(name.toLowerCase())

          const protectedReason = isProtectedStartupName(name)
          const fullPath = join(userDir, file)

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
          const name = file.replace(/\.plist$/i, '')
          if (seenNames.has(name.toLowerCase())) continue
          seenNames.add(name.toLowerCase())

          const protectedReason = isProtectedStartupName(name)
          const fullPath = join(sysDir, file)

          entries.push({
            id: encodeId(['system-launch-agent', file]),
            name,
            location: fullPath,
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

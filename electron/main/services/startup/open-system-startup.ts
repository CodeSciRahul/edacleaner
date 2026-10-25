import { spawn } from 'child_process'
import { access } from 'fs/promises'
import { delimiter, join } from 'path'

/** macOS System Settings → General → Login Items (Open at Login). */
export const MAC_LOGIN_ITEMS_URL =
  'x-apple.systempreferences:com.apple.LoginItems-Settings.extension'

/** Older macOS Users & Groups pane, used only if Login Items cannot be opened. */
export const MAC_LOGIN_ITEMS_FALLBACK_URL =
  'x-apple.systempreferences:com.apple.preference.users'

/** Windows Settings → Apps → Startup. */
export const WINDOWS_STARTUP_APPS_URL = 'ms-settings:startupapps'

export interface StartupCommand {
  command: string
  args: string[]
}

function desktopSignature(env: NodeJS.ProcessEnv): string {
  return `${env.XDG_CURRENT_DESKTOP ?? ''} ${env.XDG_SESSION_DESKTOP ?? ''} ${env.DESKTOP_SESSION ?? ''}`.toLowerCase()
}

/**
 * Desktop startup tools, preferred match first. Each one opens that desktop's
 * own startup / autostart screen rather than a generic settings window.
 */
export function linuxStartupCommands(env: NodeJS.ProcessEnv = process.env): StartupCommand[] {
  const desktop = desktopSignature(env)
  const preferred: StartupCommand[] = []

  if (/\b(kde|plasma)\b/.test(desktop)) {
    preferred.push(
      { command: 'kcmshell6', args: ['kcm_autostart'] },
      { command: 'kcmshell5', args: ['kcm_autostart'] },
      { command: 'systemsettings', args: ['kcm_autostart'] },
      { command: 'systemsettings5', args: ['kcm_autostart'] }
    )
  } else if (/\bxfce\b/.test(desktop)) {
    preferred.push({ command: 'xfce4-session-settings', args: [] })
  } else if (/\bcinnamon\b/.test(desktop)) {
    preferred.push({ command: 'cinnamon-settings', args: ['startup'] })
  } else if (/\bmate\b/.test(desktop)) {
    preferred.push({ command: 'mate-session-properties', args: [] })
  } else if (/\blxqt\b/.test(desktop)) {
    preferred.push({ command: 'lxqt-config-session', args: [] })
  } else if (/\b(pantheon|elementary)\b/.test(desktop)) {
    preferred.push({ command: 'io.elementary.settings', args: ['startup'] })
  } else if (/\b(gnome|ubuntu|unity|budgie|pop)\b/.test(desktop)) {
    preferred.push({ command: 'gnome-session-properties', args: [] })
  }

  const fallback: StartupCommand[] = [
    { command: 'gnome-session-properties', args: [] },
    { command: 'kcmshell6', args: ['kcm_autostart'] },
    { command: 'kcmshell5', args: ['kcm_autostart'] },
    { command: 'systemsettings', args: ['kcm_autostart'] },
    { command: 'systemsettings5', args: ['kcm_autostart'] },
    { command: 'cinnamon-settings', args: ['startup'] },
    { command: 'mate-session-properties', args: [] },
    { command: 'xfce4-session-settings', args: [] },
    { command: 'lxqt-config-session', args: [] },
    { command: 'io.elementary.settings', args: ['startup'] }
  ]

  const seen = new Set<string>()
  const ordered: StartupCommand[] = []
  for (const item of [...preferred, ...fallback]) {
    const key = `${item.command}\0${item.args.join('\0')}`
    if (seen.has(key)) continue
    seen.add(key)
    ordered.push(item)
  }
  return ordered
}

async function commandOnPath(command: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  if (command.includes('/')) {
    try {
      await access(command)
      return true
    } catch {
      return false
    }
  }
  const pathEnv = env.PATH ?? ''
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue
    try {
      await access(join(dir, command))
      return true
    } catch {
      // try the next PATH entry
    }
  }
  return false
}

function spawnDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

async function defaultOpenUrl(url: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { shell } = require('electron') as typeof import('electron')
  await shell.openExternal(url)
}

export interface OpenSystemStartupDeps {
  platform?: NodeJS.Platform
  env?: NodeJS.ProcessEnv
  openUrl?: (url: string) => Promise<void>
  commandExists?: (command: string) => Promise<boolean>
  spawnCommand?: (command: string, args: string[]) => Promise<void>
}

/**
 * Open the operating system's own startup screen:
 * macOS Login Items, Windows Startup apps, or the Linux desktop's autostart tool.
 */
export async function openSystemStartupSettings(
  deps: OpenSystemStartupDeps = {}
): Promise<{ opened: true }> {
  const platform = deps.platform ?? process.platform
  const env = deps.env ?? process.env
  const openUrl = deps.openUrl ?? defaultOpenUrl
  const spawnCommand = deps.spawnCommand ?? spawnDetached
  const commandExists = deps.commandExists ?? ((command: string) => commandOnPath(command, env))

  if (platform === 'darwin') {
    try {
      await spawnCommand('open', [MAC_LOGIN_ITEMS_URL])
    } catch {
      await spawnCommand('open', [MAC_LOGIN_ITEMS_FALLBACK_URL])
    }
    return { opened: true }
  }

  if (platform === 'win32') {
    try {
      await openUrl(WINDOWS_STARTUP_APPS_URL)
    } catch {
      await spawnCommand('cmd.exe', ['/c', 'start', '', WINDOWS_STARTUP_APPS_URL])
    }
    return { opened: true }
  }

  if (platform === 'linux') {
    let lastError: Error | null = null
    for (const candidate of linuxStartupCommands(env)) {
      if (!(await commandExists(candidate.command))) continue
      try {
        await spawnCommand(candidate.command, candidate.args)
        return { opened: true }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }
    throw (
      lastError ??
      new Error(
        'No startup settings app was found. Install your desktop’s Startup Applications tool and try again.'
      )
    )
  }

  throw new Error('Startup settings are not available on this operating system')
}

import { describe, expect, it, vi } from 'vitest'
import {
  MAC_LOGIN_ITEMS_URL,
  WINDOWS_STARTUP_APPS_URL,
  linuxStartupCommands,
  openSystemStartupSettings
} from '../open-system-startup'

describe('openSystemStartupSettings', () => {
  it('opens macOS Login Items', async () => {
    const spawnCommand = vi.fn().mockResolvedValue(undefined)
    await openSystemStartupSettings({ platform: 'darwin', spawnCommand })
    expect(spawnCommand).toHaveBeenCalledWith('open', [MAC_LOGIN_ITEMS_URL])
  })

  it('falls back to the older macOS users pane when Login Items cannot be opened', async () => {
    const spawnCommand = vi
      .fn()
      .mockRejectedValueOnce(new Error('no pane'))
      .mockResolvedValueOnce(undefined)
    await openSystemStartupSettings({ platform: 'darwin', spawnCommand })
    expect(spawnCommand).toHaveBeenNthCalledWith(2, 'open', [
      'x-apple.systempreferences:com.apple.preference.users'
    ])
  })

  it('opens Windows Startup apps', async () => {
    const openUrl = vi.fn().mockResolvedValue(undefined)
    const spawnCommand = vi.fn()
    await openSystemStartupSettings({ platform: 'win32', openUrl, spawnCommand })
    expect(openUrl).toHaveBeenCalledWith(WINDOWS_STARTUP_APPS_URL)
    expect(spawnCommand).not.toHaveBeenCalled()
  })

  it('falls back to the Windows start command when the settings URL is rejected', async () => {
    const openUrl = vi.fn().mockRejectedValue(new Error('blocked'))
    const spawnCommand = vi.fn().mockResolvedValue(undefined)
    await openSystemStartupSettings({ platform: 'win32', openUrl, spawnCommand })
    expect(spawnCommand).toHaveBeenCalledWith('cmd.exe', [
      '/c',
      'start',
      '',
      WINDOWS_STARTUP_APPS_URL
    ])
  })

  it('prefers the GNOME startup applications window', () => {
    const commands = linuxStartupCommands({ XDG_CURRENT_DESKTOP: 'ubuntu:GNOME' })
    expect(commands[0]).toEqual({ command: 'gnome-session-properties', args: [] })
  })

  it('prefers KDE autostart settings', () => {
    const commands = linuxStartupCommands({ XDG_CURRENT_DESKTOP: 'KDE' })
    expect(commands[0]).toEqual({ command: 'kcmshell6', args: ['kcm_autostart'] })
  })

  it('prefers the desktop tool that matches XFCE, Cinnamon, and MATE', () => {
    expect(linuxStartupCommands({ XDG_CURRENT_DESKTOP: 'XFCE' })[0]?.command).toBe(
      'xfce4-session-settings'
    )
    expect(linuxStartupCommands({ DESKTOP_SESSION: 'cinnamon' })[0]).toEqual({
      command: 'cinnamon-settings',
      args: ['startup']
    })
    expect(linuxStartupCommands({ XDG_SESSION_DESKTOP: 'mate' })[0]?.command).toBe(
      'mate-session-properties'
    )
  })

  it('opens the first Linux startup tool that is installed', async () => {
    const spawnCommand = vi.fn().mockResolvedValue(undefined)
    const commandExists = vi.fn(async (command: string) => command === 'kcmshell6')
    await openSystemStartupSettings({
      platform: 'linux',
      env: { XDG_CURRENT_DESKTOP: 'GNOME', PATH: '/usr/bin' },
      commandExists,
      spawnCommand
    })
    expect(spawnCommand).toHaveBeenCalledWith('kcmshell6', ['kcm_autostart'])
  })

  it('reports a clear error when Linux has no startup settings app', async () => {
    await expect(
      openSystemStartupSettings({
        platform: 'linux',
        env: { XDG_CURRENT_DESKTOP: 'GNOME' },
        commandExists: async () => false,
        spawnCommand: vi.fn()
      })
    ).rejects.toThrow(/No startup settings app/)
  })
})

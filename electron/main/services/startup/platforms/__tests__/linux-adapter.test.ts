import { describe, expect, it } from 'vitest'
import {
  parseDesktop,
  setDesktopEnabled
} from '../linux-adapter'
import { classifyStartupImpact } from '../startup-safety'

describe('LinuxStartupAdapter helpers', () => {
  it('parses typical .desktop files including Microsoft Teams', () => {
    const teamsDesktop = `
[Desktop Entry]
Name=Microsoft Teams
Comment=Microsoft Teams for Linux
Exec=/usr/bin/teams --minimized %U
Icon=teams
Terminal=false
Type=Application
Categories=Network;Chat;
Hidden=false
X-GNOME-Autostart-enabled=true
`.trim()

    const parsed = parseDesktop(teamsDesktop)
    expect(parsed.name).toBe('Microsoft Teams')
    expect(parsed.comment).toBe('Microsoft Teams for Linux')
    expect(parsed.exec).toBe('/usr/bin/teams --minimized')
    expect(parsed.hidden).toBe(false)
    expect(parsed.enabled).toBe(true)
    expect(classifyStartupImpact(parsed.name)).toBe('high')
  })

  it('detects disabled state when Hidden=true or X-GNOME-Autostart-enabled=false', () => {
    const disabledDesktop = `
[Desktop Entry]
Name=Discord
Exec=/usr/bin/discord
Hidden=true
`.trim()

    const parsed = parseDesktop(disabledDesktop)
    expect(parsed.name).toBe('Discord')
    expect(parsed.hidden).toBe(true)
    expect(parsed.enabled).toBe(false)

    const gnomeDisabled = `
[Desktop Entry]
Name=Slack
Exec=/usr/bin/slack
X-GNOME-Autostart-enabled=false
`.trim()

    const parsedGnome = parseDesktop(gnomeDisabled)
    expect(parsedGnome.name).toBe('Slack')
    expect(parsedGnome.enabled).toBe(false)
  })

  it('toggles desktop enabled flag cleanly without corrupting other entries', () => {
    const initial = `[Desktop Entry]\nName=Zoom\nExec=zoom\nHidden=false\nX-GNOME-Autostart-enabled=true\n`
    const disabled = setDesktopEnabled(initial, false)
    expect(disabled).toContain('Hidden=true')
    expect(disabled).toContain('X-GNOME-Autostart-enabled=false')
    expect(disabled).toContain('Name=Zoom')

    const reEnabled = setDesktopEnabled(disabled, true)
    expect(reEnabled).toContain('Hidden=false')
    expect(reEnabled).toContain('X-GNOME-Autostart-enabled=true')
  })

  it('injects Hidden and X-GNOME keys under [Desktop Entry] if missing', () => {
    const raw = `[Desktop Entry]\nType=Application\nName=Teams\nExec=teams\n`
    const disabled = setDesktopEnabled(raw, false)
    expect(disabled).toContain('Hidden=true')
    expect(disabled).toContain('X-GNOME-Autostart-enabled=false')

    const parsed = parseDesktop(disabled)
    expect(parsed.name).toBe('Teams')
    expect(parsed.enabled).toBe(false)
  })
})

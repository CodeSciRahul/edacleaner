import { describe, expect, it, vi } from 'vitest'
import { runCommand } from '@main/services/boost/platforms/exec-utils'
import {
  WindowsStartupAdapter,
  buildStartupApprovedHex,
  friendlyRegistryName,
  friendlyTaskName,
  isStartupApprovedEnabled,
  parseStartupApprovedOutput
} from '../windows-adapter'
import { classifyStartupImpact, encodeId } from '../startup-safety'

vi.mock('@main/services/boost/platforms/exec-utils', () => ({
  runCommand: vi.fn()
}))

describe('WindowsStartupAdapter helpers', () => {
  it('normalizes Squirrel / classic registry names for Microsoft Teams and other apps', () => {
    expect(friendlyRegistryName('com.squirrel.Teams.Teams')).toBe('Microsoft Teams')
    expect(friendlyRegistryName('Teams')).toBe('Microsoft Teams')
    expect(friendlyRegistryName('com.squirrel.Discord.Discord')).toBe('Discord')
    expect(friendlyRegistryName('com.squirrel.Slack.Slack')).toBe('Slack')
    expect(friendlyRegistryName('OneDrive')).toBe('Microsoft OneDrive')
  })

  it('normalizes modern UWP / MSIX StartupApproved task names', () => {
    expect(friendlyTaskName('MicrosoftTeams_8wekyb3d8bbwe!MSTeams')).toBe('Microsoft Teams')
    expect(friendlyTaskName('MSTeams_8wekyb3d8bbwe!MSTeams')).toBe('Microsoft Teams')
    expect(friendlyTaskName('msteams_8wekyb3d8bbwe!msteams')).toBe('Microsoft Teams')
    expect(friendlyTaskName('Microsoft.Teams.Free_8wekyb3d8bbwe!App')).toBe('Microsoft Teams')
    expect(friendlyTaskName('WhatsAppDesktop_cv1g1gvanyjgm!WhatsAppDesktop')).toBe('WhatsApp')
    expect(friendlyTaskName('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify')).toBe('Spotify')
    expect(friendlyTaskName('Telegram.TelegramDesktop_t4vj0pshhgkw4!Telegram')).toBe('Telegram')
  })

  it('formats generic PascalCase and kebab-case store apps gracefully', () => {
    expect(friendlyTaskName('WindowsTerminal_8wekyb3d8bbwe!App')).toBe('Windows Terminal')
  })

  it('correctly classifies impact of Teams and common startup items', () => {
    expect(classifyStartupImpact(friendlyTaskName('MicrosoftTeams_8wekyb3d8bbwe!MSTeams'))).toBe('high')
    expect(classifyStartupImpact(friendlyRegistryName('com.squirrel.Teams.Teams'))).toBe('high')
    expect(classifyStartupImpact('Spotify')).toBe('high')
    expect(classifyStartupImpact('Microsoft OneDrive')).toBe('medium')
    expect(classifyStartupImpact('RandomBackgroundUtility')).toBe('unknown')
  })

  it('treats StartupApproved status bytes the way Windows Settings does', () => {
    expect(isStartupApprovedEnabled(0x02)).toBe(true)
    expect(isStartupApprovedEnabled(0x00)).toBe(true)
    expect(isStartupApprovedEnabled(0x06)).toBe(true)
    expect(isStartupApprovedEnabled(0x03)).toBe(false)
    expect(isStartupApprovedEnabled(0x01)).toBe(false)
  })

  it('writes a non-zero FILETIME when disabling so Windows honors the flag', () => {
    const disabled = buildStartupApprovedHex(false, new Date('2020-01-01T00:00:00Z'))
    const enabled = buildStartupApprovedHex(true, new Date('2020-01-01T00:00:00Z'))
    expect(disabled).toHaveLength(24)
    expect(disabled.startsWith('03000000')).toBe(true)
    expect(disabled.slice(8)).not.toBe('0000000000000000')
    expect(enabled.startsWith('02000000')).toBe(true)
    expect(enabled.slice(8)).toBe('0000000000000000')
  })

  it('reads both continuous and space-separated reg query hex', () => {
    const stdout = `
HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run

    Spotify    REG_BINARY    030000001122334455667788
    Discord    REG_BINARY    02 00 00 00 00 00 00 00 00 00 00 00
    EpicGames    REG_BINARY    060000000000000000000000

`
    const map = parseStartupApprovedOutput(stdout)
    expect(map.get('Spotify')).toBe(false)
    expect(map.get('Discord')).toBe(true)
    expect(map.get('EpicGames')).toBe(true)
  })

  it('disables an all-users Run entry for the current user without touching HKLM', async () => {
    const previousLevel = process.env.EDA_LOG_LEVEL
    process.env.EDA_LOG_LEVEL = 'error'
    vi.mocked(runCommand).mockImplementation(async (_file, args) => {
      if (args[0] === 'query') {
        return { stdout: '\r\n', stderr: '' }
      }
      return { stdout: 'The operation completed successfully.\r\n', stderr: '' }
    })

    const adapter = new WindowsStartupAdapter()
    const result = await adapter.setEnabled(encodeId(['hklm-run', 'Spotify']), false)

    expect(result.success).toBe(true)
    expect(result.entry?.enabled).toBe(false)
    expect(result.entry?.canToggle).toBe(true)

    const addCall = vi.mocked(runCommand).mock.calls.find((call) => call[1][0] === 'add')
    expect(addCall?.[1][1]).toBe(
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'
    )
    expect(addCall?.[1]).toContain('Spotify')
    const hex = addCall?.[1][addCall[1].indexOf('/d') + 1]
    expect(hex?.toLowerCase().startsWith('03')).toBe(true)
    expect(hex?.slice(8)).not.toBe('0000000000000000')
    expect(vi.mocked(runCommand).mock.calls.some((call) => call[1][0] === 'delete')).toBe(false)
    expect(
      vi.mocked(runCommand).mock.calls.some(
        (call) => call[1][0] !== 'query' && String(call[1][1] ?? '').startsWith('HKLM\\')
      )
    ).toBe(false)
    if (previousLevel === undefined) delete process.env.EDA_LOG_LEVEL
    else process.env.EDA_LOG_LEVEL = previousLevel
  })
})

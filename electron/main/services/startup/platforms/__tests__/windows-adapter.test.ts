import { describe, expect, it } from 'vitest'
import {
  friendlyRegistryName,
  friendlyTaskName
} from '../windows-adapter'
import { classifyStartupImpact } from '../startup-safety'

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
})

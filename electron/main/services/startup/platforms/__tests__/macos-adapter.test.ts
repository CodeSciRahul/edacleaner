import { describe, expect, it } from 'vitest'
import { MacosStartupAdapter, parseLoginItemsOutput } from '../macos-adapter'

describe('MacosStartupAdapter', () => {
  it('instantiates and lists startup entries including BTM items if available', async () => {
    const adapter = new MacosStartupAdapter()
    expect(adapter.platformId).toBe('darwin')
    const entries = await adapter.listEntries()
    expect(Array.isArray(entries)).toBe(true)
    // On this mac machine with Teams installed, Teams or background items should be discovered
    const teamsEntry = entries.find((e) => e.name.toLowerCase().includes('teams'))
    if (teamsEntry) {
      expect(teamsEntry.name).toBe('Microsoft Teams')
      expect(teamsEntry.impact).toBe('high')
      expect(teamsEntry.canToggle).toBe(false)
      expect(teamsEntry.protectedReason).toMatch(/System Settings/)
    }
  }, 15000)

  it('parses System Events login items', () => {
    const parsed = parseLoginItemsOutput(
      'Spotify\t/Applications/Spotify.app\tfalse\nSlack\t/Applications/Slack.app\ttrue\n'
    )
    expect(parsed).toEqual([
      { name: 'Spotify', path: '/Applications/Spotify.app', hidden: false },
      { name: 'Slack', path: '/Applications/Slack.app', hidden: true }
    ])
  })
})

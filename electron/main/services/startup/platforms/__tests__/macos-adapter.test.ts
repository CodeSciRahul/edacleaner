import { describe, expect, it } from 'vitest'
import { MacosStartupAdapter } from '../macos-adapter'

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
      expect(teamsEntry.canToggle).toBe(true)
    }
  }, 15000)
})

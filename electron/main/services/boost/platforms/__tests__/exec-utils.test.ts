import { describe, expect, it } from 'vitest'
import {
  getSelfProcessIds,
  isProtectedProcess,
  isSelfCleanerProcess
} from '../exec-utils'

describe('exec-utils process protection', () => {
  it('identifies EDA Cleaner and Electron variants as self cleaner processes', () => {
    expect(isSelfCleanerProcess('EDA Cleaner', 99999)).toBe(true)
    expect(isSelfCleanerProcess('edacleaner', 99999)).toBe(true)
    expect(isSelfCleanerProcess('eda-cleaner.exe', 99999)).toBe(true)
    expect(isSelfCleanerProcess('EDA Cleaner Helper (Renderer)', 99999)).toBe(true)
    expect(isSelfCleanerProcess('Electron', 99999)).toBe(true)
    expect(isSelfCleanerProcess('electron.exe', 99999)).toBe(true)
    expect(isSelfCleanerProcess('EDA', 99999, '/Applications/EDA Cleaner.app/Contents/MacOS/EDA Cleaner')).toBe(true)
    expect(isSelfCleanerProcess('eda', 99999)).toBe(true)
  })

  it('protects self cleaner processes via isProtectedProcess', () => {
    expect(isProtectedProcess('EDA Cleaner', 99999)).toBe(true)
    expect(isProtectedProcess('edacleaner.exe', 99999)).toBe(true)
    expect(isProtectedProcess('Electron', 99999)).toBe(true)
    expect(isProtectedProcess('EDA Cleaner Helper', 99999)).toBe(true)
  })

  it('includes process.pid in getSelfProcessIds', () => {
    const pids = getSelfProcessIds()
    expect(pids.has(process.pid)).toBe(true)
  })

  it('marks regular user apps as not self cleaner', () => {
    expect(isSelfCleanerProcess('Google Chrome', 99999, '/Applications/Google Chrome.app')).toBe(false)
    expect(isSelfCleanerProcess('Slack', 99999, '/Applications/Slack.app')).toBe(false)
    expect(isSelfCleanerProcess('Spotify.exe', 99999, 'C:\\Program Files\\Spotify\\Spotify.exe')).toBe(false)
  })
})

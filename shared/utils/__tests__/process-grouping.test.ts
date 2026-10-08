import { describe, expect, it } from 'vitest'
import type { BoostProcessInfo } from '@shared/interfaces'
import { getAppIdentityKey, groupProcessesByApp } from '../process-grouping'

describe('process-grouping', () => {
  it('identifies app keys correctly for windows, macos and linux names', () => {
    expect(getAppIdentityKey({ name: 'chrome.exe' })).toBe('name:chrome')
    expect(getAppIdentityKey({ name: 'CHROME.EXE' })).toBe('name:chrome')
    expect(getAppIdentityKey({ name: 'Slack.exe' })).toBe('name:slack')
    expect(getAppIdentityKey({ name: 'Discord.exe' })).toBe('name:discord')
    expect(getAppIdentityKey({ name: 'Google Chrome Helper' })).toBe('name:google chrome')
    expect(getAppIdentityKey({ name: 'Google Chrome Helper (Renderer)' })).toBe('name:google chrome')
    expect(
      getAppIdentityKey({
        name: 'Google Chrome Helper',
        path: '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/1.0/Helpers/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper'
      })
    ).toBe('bundle:/applications/google chrome.app')
  })

  it('groups multiple processes of the same app into a single entry with combined memory and CPU', () => {
    const rawProcesses: BoostProcessInfo[] = [
      {
        pid: 101,
        name: 'chrome.exe',
        memoryBytes: 200 * 1024 * 1024,
        cpuPercent: 1.5,
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        safeToTerminate: true,
        iconDataUrl: 'data:image/png;base64,chromeicon'
      },
      {
        pid: 102,
        name: 'chrome.exe',
        memoryBytes: 150 * 1024 * 1024,
        cpuPercent: 0.5,
        path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        safeToTerminate: true
      },
      {
        pid: 103,
        name: 'chrome.exe',
        memoryBytes: 50 * 1024 * 1024,
        cpuPercent: 0.2,
        safeToTerminate: true
      },
      {
        pid: 201,
        name: 'slack.exe',
        memoryBytes: 100 * 1024 * 1024,
        cpuPercent: 0.8,
        path: 'C:\\Users\\User\\AppData\\Local\\slack\\slack.exe',
        safeToTerminate: true
      }
    ]

    const grouped = groupProcessesByApp(rawProcesses)

    expect(grouped).toHaveLength(2)

    const chrome = grouped.find((p) => p.name === 'chrome.exe')
    expect(chrome).toBeDefined()
    expect(chrome?.memoryBytes).toBe(400 * 1024 * 1024)
    expect(chrome?.cpuPercent).toBe(2.2)
    expect(chrome?.pids).toEqual([101, 102, 103])
    expect(chrome?.processCount).toBe(3)
    expect(chrome?.pid).toBe(101)
    expect(chrome?.iconDataUrl).toBe('data:image/png;base64,chromeicon')
    expect(chrome?.safeToTerminate).toBe(true)

    const slack = grouped.find((p) => p.name === 'slack.exe')
    expect(slack).toBeDefined()
    expect(slack?.memoryBytes).toBe(100 * 1024 * 1024)
    expect(slack?.processCount).toBe(1)
    expect(slack?.pids).toEqual([201])
  })

  it('marks safeToTerminate as false if any process in the group is protected', () => {
    const rawProcesses: BoostProcessInfo[] = [
      {
        pid: 301,
        name: 'electron.exe',
        memoryBytes: 120 * 1024 * 1024,
        cpuPercent: 1.0,
        safeToTerminate: false
      },
      {
        pid: 302,
        name: 'electron.exe',
        memoryBytes: 80 * 1024 * 1024,
        cpuPercent: 0.2,
        safeToTerminate: true
      }
    ]

    const grouped = groupProcessesByApp(rawProcesses)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].safeToTerminate).toBe(false)
    expect(grouped[0].processCount).toBe(2)
  })

  it('groups macOS app bundle helper processes into the main app', () => {
    const rawProcesses: BoostProcessInfo[] = [
      {
        pid: 501,
        name: 'Google Chrome',
        memoryBytes: 300 * 1024 * 1024,
        cpuPercent: 2.0,
        path: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        safeToTerminate: true
      },
      {
        pid: 502,
        name: 'Google Chrome Helper',
        memoryBytes: 150 * 1024 * 1024,
        cpuPercent: 0.5,
        path: '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/1.0/Helpers/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper',
        safeToTerminate: true
      }
    ]

    const grouped = groupProcessesByApp(rawProcesses)
    expect(grouped).toHaveLength(1)
    expect(grouped[0].name).toBe('Google Chrome')
    expect(grouped[0].memoryBytes).toBe(450 * 1024 * 1024)
    expect(grouped[0].pids).toEqual([501, 502])
  })

  it('is idempotent when run on already-grouped processes', () => {
    const rawProcesses: BoostProcessInfo[] = [
      {
        pid: 101,
        name: 'code.exe',
        memoryBytes: 250 * 1024 * 1024,
        cpuPercent: 1.0,
        safeToTerminate: true
      },
      {
        pid: 102,
        name: 'code.exe',
        memoryBytes: 150 * 1024 * 1024,
        cpuPercent: 0.5,
        safeToTerminate: true
      }
    ]

    const firstPass = groupProcessesByApp(rawProcesses)
    const secondPass = groupProcessesByApp(firstPass)

    expect(firstPass).toEqual(secondPass)
    expect(secondPass[0].processCount).toBe(2)
    expect(secondPass[0].pids).toEqual([101, 102])
    expect(secondPass[0].memoryBytes).toBe(400 * 1024 * 1024)
  })
})

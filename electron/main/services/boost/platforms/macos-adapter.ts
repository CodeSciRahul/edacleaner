import { homedir } from 'os'
import { join } from 'path'
import { access, readdir } from 'fs/promises'
import checkDiskSpaceImport from 'check-disk-space'
import type {
  BoostDiskPressure,
  BoostProcessInfo,
  BoostStartupAppInfo
} from '@shared/interfaces'
import type {
  PlatformBoostAdapter,
  PlatformDnsResult,
  PlatformTerminateResult,
  PlatformTrashResult
} from './platform-adapter'
import {
  classifyStartupImpact,
  isProtectedProcess,
  runCommand
} from './exec-utils'
import { createLogger } from '@main/utils/logger'

const log = createLogger('boost:mac')

type CheckDiskSpaceFn = (directoryPath: string) => Promise<{
  diskPath: string
  free: number
  size: number
}>

const checkDiskSpace: CheckDiskSpaceFn =
  typeof checkDiskSpaceImport === 'function'
    ? (checkDiskSpaceImport as CheckDiskSpaceFn)
    : (checkDiskSpaceImport as unknown as { default: CheckDiskSpaceFn }).default

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export class MacosBoostAdapter implements PlatformBoostAdapter {
  readonly platformId = 'darwin' as const

  supportsEmptyTrash(): boolean {
    return true
  }

  supportsDnsFlush(): boolean {
    return true
  }

  supportsStartupEnumeration(): boolean {
    return true
  }

  async listProcesses(limit = 25): Promise<BoostProcessInfo[]> {
    try {
      const { stdout } = await runCommand('ps', ['-axo', 'pid=,rss=,pcpu=,comm='])
      const processes: BoostProcessInfo[] = []

      for (const line of stdout.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const match = trimmed.match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(.+)$/)
        if (!match) continue
        const pid = Number(match[1])
        const rssKb = Number(match[2])
        const cpu = Number(match[3])
        const name = match[4].trim()
        processes.push({
          pid,
          name,
          memoryBytes: rssKb * 1024,
          cpuPercent: cpu,
          safeToTerminate: !isProtectedProcess(name, pid)
        })
      }

      return processes.sort((a, b) => b.memoryBytes - a.memoryBytes).slice(0, limit)
    } catch (err) {
      log.warn('listProcesses failed', err)
      return []
    }
  }

  async listStartupApps(): Promise<BoostStartupAppInfo[]> {
    const apps: BoostStartupAppInfo[] = []
    const agentsDir = join(homedir(), 'Library', 'LaunchAgents')

    if (await pathExists(agentsDir)) {
      try {
        const entries = await readdir(agentsDir)
        for (const entry of entries) {
          if (!entry.endsWith('.plist')) continue
          const name = entry.replace(/\.plist$/i, '')
          apps.push({
            id: `mac-launchagent:${entry}`,
            name,
            path: join(agentsDir, entry),
            impact: classifyStartupImpact(name),
            enabled: true,
            canDisable: false,
            source: 'LaunchAgents'
          })
        }
      } catch (err) {
        log.warn('listStartupApps failed', err)
      }
    }

    return apps
  }

  async getDiskPressure(): Promise<BoostDiskPressure | null> {
    try {
      const space = await checkDiskSpace('/')
      const usedPercent = Math.round(((space.size - space.free) / Math.max(space.size, 1)) * 100)
      return {
        mountPath: '/',
        freeBytes: space.free,
        totalBytes: space.size,
        usedPercent,
        isLow: space.free < 5 * 1024 * 1024 * 1024 || usedPercent >= 90
      }
    } catch (err) {
      log.warn('getDiskPressure failed', err)
      return null
    }
  }

  async getCacheDirectories(): Promise<string[]> {
    const home = homedir()
    const candidates = [
      join(home, 'Library', 'Caches', 'Google', 'Chrome'),
      join(home, 'Library', 'Caches', 'Microsoft Edge'),
      join(home, 'Library', 'Caches', 'Firefox'),
      join(home, 'Library', 'Caches', 'com.apple.Safari')
    ]
    const existing: string[] = []
    for (const dir of candidates) {
      if (await pathExists(dir)) existing.push(dir)
    }
    return existing
  }

  async getTempDirectories(): Promise<string[]> {
    const dirs: string[] = []
    const tmp = process.env.TMPDIR
    if (tmp && (await pathExists(tmp))) dirs.push(tmp)
    if (await pathExists('/tmp')) dirs.push('/tmp')
    return dirs
  }

  async emptyTrash(_signal?: AbortSignal): Promise<PlatformTrashResult> {
    try {
      await runCommand('osascript', [
        '-e',
        'tell application "Finder" to empty trash'
      ])
      return { emptied: true, detail: 'Trash emptied' }
    } catch (err) {
      // Fallback: attempt clearing ~/.Trash contents is intentional no-op here for safety
      return {
        emptied: false,
        detail: 'Could not empty Trash (permission or Finder unavailable)',
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  async flushDnsCache(_signal?: AbortSignal): Promise<PlatformDnsResult> {
    try {
      await runCommand('dscacheutil', ['-flushcache'])
      try {
        await runCommand('killall', ['-HUP', 'mDNSResponder'])
      } catch {
        // mDNSResponder reload may require privileges — DNS cache still flushed above
      }
      return { flushed: true, detail: 'DNS cache flushed' }
    } catch (err) {
      return {
        flushed: false,
        detail: 'DNS flush failed (may require elevated permissions)',
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  async terminateProcesses(
    pids: number[],
    signal?: AbortSignal
  ): Promise<PlatformTerminateResult> {
    const failed: Array<{ pid: number; error: string }> = []
    let terminated = 0

    for (const pid of pids) {
      if (signal?.aborted) break
      if (isProtectedProcess(`pid-${pid}`, pid)) {
        failed.push({ pid, error: 'Protected process' })
        continue
      }
      try {
        await runCommand('kill', ['-TERM', String(pid)], { signal })
        terminated += 1
      } catch (err) {
        failed.push({
          pid,
          error: err instanceof Error ? err.message : 'Failed to terminate'
        })
      }
    }

    return {
      terminated,
      failed,
      detail: `Sent TERM to ${terminated} process(es)`
    }
  }
}

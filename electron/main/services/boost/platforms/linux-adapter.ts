import { homedir } from 'os'
import { join } from 'path'
import { access, readdir, readFile } from 'fs/promises'
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
import { cleanDirectoryContents } from '../fs-utils'

const log = createLogger('boost:linux')

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

export class LinuxBoostAdapter implements PlatformBoostAdapter {
  readonly platformId = 'linux' as const

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
      const { stdout } = await runCommand('ps', ['-axo', 'pid=,rss=,pcpu=,args='])
      const processes: BoostProcessInfo[] = []

      for (const line of stdout.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const match = trimmed.match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(.+)$/)
        if (!match) continue
        const pid = Number(match[1])
        const rssKb = Number(match[2])
        const cpu = Number(match[3])
        const args = match[4].trim()
        const exePath = args.startsWith('/') ? args.split(/\s+/)[0] : undefined
        const name = exePath ? exePath.split('/').pop() || args : args.split(/\s+/)[0] || args
        processes.push({
          pid,
          name,
          memoryBytes: rssKb * 1024,
          cpuPercent: cpu,
          path: exePath,
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
    const autostartDir = join(homedir(), '.config', 'autostart')

    if (!(await pathExists(autostartDir))) return apps

    try {
      const entries = await readdir(autostartDir)
      for (const entry of entries) {
        if (!entry.endsWith('.desktop')) continue
        const fullPath = join(autostartDir, entry)
        let name = entry.replace(/\.desktop$/i, '')
        let enabled = true

        try {
          const content = await readFile(fullPath, 'utf-8')
          const nameMatch = content.match(/^Name=(.+)$/m)
          const hiddenMatch = content.match(/^Hidden=(.+)$/m)
          if (nameMatch) name = nameMatch[1].trim()
          if (hiddenMatch?.[1]?.toLowerCase() === 'true') enabled = false
        } catch {
          // use filename
        }

        apps.push({
          id: `linux-autostart:${entry}`,
          name,
          path: fullPath,
          impact: classifyStartupImpact(name),
          enabled,
          canDisable: false,
          source: 'autostart'
        })
      }
    } catch (err) {
      log.warn('listStartupApps failed', err)
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
      join(home, '.cache', 'google-chrome'),
      join(home, '.cache', 'chromium'),
      join(home, '.cache', 'mozilla'),
      join(home, '.cache', 'ms-playwright')
    ]
    const existing: string[] = []
    for (const dir of candidates) {
      if (await pathExists(dir)) existing.push(dir)
    }
    return existing
  }

  async getTempDirectories(): Promise<string[]> {
    const dirs: string[] = []
    if (await pathExists('/tmp')) dirs.push('/tmp')
    const xdg = process.env.XDG_RUNTIME_DIR
    if (xdg && (await pathExists(xdg))) {
      // Do not wipe entire runtime dir — only nested tmp-like folders if present
    }
    return dirs
  }

  async emptyTrash(signal?: AbortSignal): Promise<PlatformTrashResult> {
    try {
      await runCommand('trash-empty', [], { signal, timeoutMs: 60_000 })
      return { emptied: true, detail: 'Trash emptied via trash-empty' }
    } catch {
      // Fallback: clear FreeDesktop trash dirs
      const home = homedir()
      const trashDirs = [
        join(home, '.local', 'share', 'Trash', 'files'),
        join(home, '.local', 'share', 'Trash', 'info')
      ]
      let bytes = 0
      const errors: string[] = []

      for (const dir of trashDirs) {
        if (!(await pathExists(dir))) continue
        const cleaned = await cleanDirectoryContents(dir, signal)
        bytes += cleaned.bytesRemoved
        errors.push(...cleaned.errors.slice(0, 5))
      }

      if (bytes > 0 || errors.length === 0) {
        return {
          emptied: true,
          detail: `Trash directories cleaned (${bytes} bytes removed)`
        }
      }

      return {
        emptied: false,
        detail: 'Could not empty Trash',
        error: errors[0] ?? 'trash-empty unavailable'
      }
    }
  }

  async flushDnsCache(_signal?: AbortSignal): Promise<PlatformDnsResult> {
    const attempts: Array<[string, string[]]> = [
      ['resolvectl', ['flush-caches']],
      ['systemd-resolve', ['--flush-caches']],
      ['nscd', ['-i', 'hosts']]
    ]

    for (const [cmd, args] of attempts) {
      try {
        await runCommand(cmd, args)
        return { flushed: true, detail: `DNS cache flushed via ${cmd}` }
      } catch {
        // try next
      }
    }

    return {
      flushed: false,
      detail: 'DNS flush not available on this Linux setup',
      error: 'No supported DNS flush tool found (resolvectl / systemd-resolve / nscd)'
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

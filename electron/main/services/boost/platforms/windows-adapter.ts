import { homedir } from 'os'
import { join } from 'path'
import { access } from 'fs/promises'
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

const log = createLogger('boost:win')

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

export class WindowsBoostAdapter implements PlatformBoostAdapter {
  readonly platformId = 'win32' as const

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
      const fetchCount = Math.max(limit * 2, 120)
      const { stdout } = await runCommand('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Get-Process | Sort-Object -Property WorkingSet64 -Descending | Select-Object -First ${fetchCount} Id,ProcessName,WorkingSet64,CPU | ConvertTo-Json -Compress`
      ])

      const parsed = JSON.parse(stdout.trim() || '[]') as
        | Array<{ Id: number; ProcessName: string; WorkingSet64: number; CPU: number | null }>
        | { Id: number; ProcessName: string; WorkingSet64: number; CPU: number | null }

      const rows = Array.isArray(parsed) ? parsed : [parsed]

      return rows
        .map((row) => {
          const name = `${row.ProcessName}.exe`
          const pid = Number(row.Id)
          return {
            pid,
            name,
            memoryBytes: Number(row.WorkingSet64) || 0,
            cpuPercent: Number(row.CPU) || 0,
            safeToTerminate: !isProtectedProcess(name, pid)
          } satisfies BoostProcessInfo
        })
        .filter((p) => p.pid > 0)
        .slice(0, limit)
    } catch (err) {
      log.warn('listProcesses failed', err)
      return []
    }
  }

  async listStartupApps(): Promise<BoostStartupAppInfo[]> {
    const apps: BoostStartupAppInfo[] = []
    const registryKeys = [
      {
        key: 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        source: 'HKCU Run'
      },
      {
        key: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
        source: 'HKLM Run'
      }
    ]

    for (const { key, source } of registryKeys) {
      try {
        const { stdout } = await runCommand('reg', ['query', key], { timeoutMs: 10_000 })
        for (const line of stdout.split(/\r?\n/)) {
          // Example: "    OneDrive    REG_SZ    C:\...\OneDrive.exe"
          const match = line.match(/^\s+(\S+)\s+REG_\w+\s+(.+)$/)
          if (!match) continue

          const name = match[1]
          const command = match[2].trim()
          apps.push({
            id: `win-run:${source}:${name}`,
            name,
            path: command,
            impact: classifyStartupImpact(name),
            enabled: true,
            canDisable: false,
            source
          })
        }
      } catch (err) {
        log.warn(`listStartupApps registry failed for ${key}`, err instanceof Error ? err.message : err)
      }
    }

    const startupDir = join(
      process.env.APPDATA ?? homedir(),
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Startup'
    )

    if (await pathExists(startupDir)) {
      try {
        const { readdir } = await import('fs/promises')
        const entries = await readdir(startupDir)
        for (const entry of entries) {
          if (entry.startsWith('.')) continue
          apps.push({
            id: `win-startup-folder:${entry}`,
            name: entry.replace(/\.(lnk|exe|bat|cmd)$/i, ''),
            path: join(startupDir, entry),
            impact: classifyStartupImpact(entry),
            enabled: true,
            canDisable: false,
            source: 'Startup folder'
          })
        }
      } catch (err) {
        log.warn('listStartupApps folder failed', err instanceof Error ? err.message : err)
      }
    }

    return apps
  }

  async getDiskPressure(): Promise<BoostDiskPressure | null> {
    try {
      const systemDrive = process.env.SystemDrive ?? 'C:'
      const space = await checkDiskSpace(`${systemDrive}\\`)
      const usedPercent = Math.round(((space.size - space.free) / Math.max(space.size, 1)) * 100)
      return {
        mountPath: `${systemDrive}\\`,
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
    const local = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local')
    const candidates = [
      join(local, 'Microsoft', 'Windows', 'INetCache'),
      join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
      join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
      join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
      join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache')
    ]
    const existing: string[] = []
    for (const dir of candidates) {
      if (await pathExists(dir)) existing.push(dir)
    }
    return existing
  }

  async getTempDirectories(): Promise<string[]> {
    const dirs = new Set<string>()
    if (process.env.TEMP) dirs.add(process.env.TEMP)
    if (process.env.TMP) dirs.add(process.env.TMP)
    const winTemp = join(process.env.SystemRoot ?? 'C:\\Windows', 'Temp')
    if (await pathExists(winTemp)) dirs.add(winTemp)
    return [...dirs]
  }

  async emptyTrash(signal?: AbortSignal): Promise<PlatformTrashResult> {
    try {
      // Prefer COM Shell API — Clear-RecycleBin often hangs/prompts even with -Force.
      await runCommand(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          [
            '$ErrorActionPreference = "SilentlyContinue";',
            '$shell = New-Object -ComObject Shell.Application;',
            '$bin = $shell.NameSpace(0xA);',
            'if ($null -eq $bin) { exit 0 };',
            '$bin.Items() | ForEach-Object {',
            '  Remove-Item -LiteralPath $_.Path -Recurse -Force -ErrorAction SilentlyContinue',
            '}'
          ].join(' ')
        ],
        { timeoutMs: 60_000, signal }
      )
      return { emptied: true, detail: 'Recycle Bin emptied' }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // Treat timeout/cancel distinctly so the UI can show an accurate step status
      if (signal?.aborted) {
        return {
          emptied: false,
          detail: 'Recycle Bin empty was cancelled',
          error: message
        }
      }
      return {
        emptied: false,
        detail: 'Could not empty Recycle Bin',
        error: message
      }
    }
  }

  async flushDnsCache(_signal?: AbortSignal): Promise<PlatformDnsResult> {
    try {
      await runCommand('ipconfig', ['/flushdns'])
      return { flushed: true, detail: 'DNS resolver cache flushed' }
    } catch (err) {
      return {
        flushed: false,
        detail: 'DNS flush failed',
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
        // Graceful close first (gives apps a chance to exit cleanly)
        await runCommand('taskkill', ['/PID', String(pid), '/T'], { signal })
        terminated += 1
        continue
      } catch (gracefulErr) {
        // Many Windows apps refuse soft kill — retry with force (/F)
        try {
          await runCommand('taskkill', ['/PID', String(pid), '/T', '/F'], { signal })
          terminated += 1
        } catch (forceErr) {
          const message =
            forceErr instanceof Error
              ? forceErr.message
              : gracefulErr instanceof Error
                ? gracefulErr.message
                : 'Failed to terminate'

          // Process may have exited after the graceful attempt
          if (/not found|no running instance/i.test(message)) {
            terminated += 1
          } else {
            failed.push({ pid, error: message })
          }
        }
      }
    }

    return {
      terminated,
      failed,
      detail: `Terminated ${terminated} process(es)`
    }
  }
}

import { app, BrowserWindow, type WebContents } from 'electron'
import os from 'os'
import { access } from 'fs/promises'
import { IPC_CHANNELS } from '@shared/constants'
import type {
  BackgroundProcessesUpdate,
  BoostAnalysis,
  BoostOperationId,
  BoostOptions,
  BoostProcessInfo,
  BoostProgressEvent,
  BoostResult,
  BoostSkippedOp,
  BoostSnapshot,
  BoostStepResult,
  MemoryInfo,
  TerminateProcessesResult
} from '@shared/interfaces'
import { createLogger } from '@main/utils/logger'
import { cleanDirectoryContents, estimateDirectorySize } from './fs-utils'
import { createPlatformBoostAdapter } from './platforms/create-adapter'
import type { PlatformBoostAdapter } from './platforms/platform-adapter'

const log = createLogger('BoostService')

const PROCESS_WATCH_INTERVAL_MS = 1500
const MIN_BACKGROUND_PROCESS_BYTES = 15 * 1024 * 1024
const MAX_BACKGROUND_PROCESSES = 40

export type BoostProgressListener = (event: BoostProgressEvent) => void

function getMemoryInfo(): MemoryInfo {
  const total = os.totalmem()
  const free = os.freemem()
  const used = total - free
  return {
    total,
    free,
    used,
    usedPercent: Math.round((used / total) * 100)
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const p of paths) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(p)
  }
  return result
}

function filterBackgroundProcesses(processes: BoostProcessInfo[]): BoostProcessInfo[] {
  return processes
    .filter((p) => p.safeToTerminate && p.memoryBytes >= MIN_BACKGROUND_PROCESS_BYTES)
    .slice(0, MAX_BACKGROUND_PROCESSES)
}

export class BoostService {
  private readonly adapter: PlatformBoostAdapter = createPlatformBoostAdapter()
  private abortController: AbortController | null = null
  private running = false

  /** Live process watchers keyed by WebContents.id */
  private readonly processWatchers = new Map<number, WebContents>()
  private processWatchTimer: NodeJS.Timeout | null = null
  private processWatchInFlight = false
  /** Previous CPU sample (Windows cumulative seconds) for delta % */
  private previousCpuSample:
    | { at: number; byPid: Map<number, number> }
    | null = null

  isRunning(): boolean {
    return this.running
  }

  cancel(): { cancelled: boolean } {
    if (!this.running || !this.abortController) {
      return { cancelled: false }
    }
    this.abortController.abort()
    log.info('Boost cancelled by user')
    return { cancelled: true }
  }

  /**
   * Lightweight background-apps list (no temp/cache analyze).
   */
  async listBackgroundProcesses(): Promise<BackgroundProcessesUpdate> {
    const raw = await this.adapter.listProcesses(100)
    const withCpu = this.applyCpuPercents(raw)
    return {
      processes: filterBackgroundProcesses(withCpu),
      updatedAt: Date.now()
    }
  }

  startProcessWatch(webContents: WebContents): { watching: boolean } {
    if (webContents.isDestroyed()) {
      return { watching: false }
    }

    this.processWatchers.set(webContents.id, webContents)
    log.info('Process watch started', {
      id: webContents.id,
      watchers: this.processWatchers.size
    })

    if (!this.processWatchTimer) {
      this.processWatchTimer = setInterval(() => {
        void this.tickProcessWatch()
      }, PROCESS_WATCH_INTERVAL_MS)
      void this.tickProcessWatch()
    }

    return { watching: true }
  }

  stopProcessWatch(webContents: WebContents): { watching: boolean } {
    this.processWatchers.delete(webContents.id)
    log.info('Process watch stopped', {
      id: webContents.id,
      watchers: this.processWatchers.size
    })

    if (this.processWatchers.size === 0) {
      this.clearProcessWatchTimer()
      this.previousCpuSample = null
    }

    return { watching: this.processWatchers.size > 0 }
  }

  private clearProcessWatchTimer(): void {
    if (this.processWatchTimer) {
      clearInterval(this.processWatchTimer)
      this.processWatchTimer = null
    }
  }

  private shouldSampleWatcher(wc: WebContents): boolean {
    if (wc.isDestroyed()) return false
    const win = BrowserWindow.fromWebContents(wc)
    if (!win || win.isDestroyed()) return false
    if (win.isMinimized()) return false
    if (!win.isFocused()) return false
    return true
  }

  private async tickProcessWatch(): Promise<void> {
    if (this.processWatchInFlight || this.processWatchers.size === 0) return

    const active: WebContents[] = []
    for (const [id, wc] of this.processWatchers) {
      if (wc.isDestroyed()) {
        this.processWatchers.delete(id)
        continue
      }
      if (this.shouldSampleWatcher(wc)) {
        active.push(wc)
      }
    }

    if (this.processWatchers.size === 0) {
      this.clearProcessWatchTimer()
      this.previousCpuSample = null
      return
    }

    if (active.length === 0) {
      return
    }

    this.processWatchInFlight = true
    try {
      const update = await this.listBackgroundProcesses()
      for (const wc of active) {
        if (!wc.isDestroyed()) {
          wc.send(IPC_CHANNELS.BOOST.PROCESSES_UPDATE, update)
        }
      }
    } catch (err) {
      log.warn('Process watch tick failed', err instanceof Error ? err.message : err)
    } finally {
      this.processWatchInFlight = false
    }
  }

  /**
   * On Windows, Get-Process CPU is cumulative processor time (seconds).
   * Convert to an approximate instantaneous % using sample deltas.
   */
  private applyCpuPercents(processes: BoostProcessInfo[]): BoostProcessInfo[] {
    if (process.platform !== 'win32') {
      return processes
    }

    const now = Date.now()
    const cpuCount = Math.max(1, os.cpus().length)
    const prev = this.previousCpuSample
    const nextByPid = new Map<number, number>()

    const mapped = processes.map((p) => {
      nextByPid.set(p.pid, p.cpuPercent)
      if (!prev) {
        return { ...p, cpuPercent: 0 }
      }

      const prevCpu = prev.byPid.get(p.pid)
      if (prevCpu == null) {
        return { ...p, cpuPercent: 0 }
      }

      const elapsedSec = Math.max(0.001, (now - prev.at) / 1000)
      const deltaCpuSec = Math.max(0, p.cpuPercent - prevCpu)
      const percent = (deltaCpuSec / elapsedSec / cpuCount) * 100
      return {
        ...p,
        cpuPercent: Math.min(100, Math.round(percent * 10) / 10)
      }
    })

    this.previousCpuSample = { at: now, byPid: nextByPid }
    return mapped
  }

  /**
   * Immediately stop user-selected background processes.
   * Only PIDs that are currently listed as safeToTerminate are allowed.
   */
  async terminateProcesses(pids: number[]): Promise<TerminateProcessesResult> {
    const requested = [...new Set(pids.filter((pid) => Number.isInteger(pid) && pid > 0))]
    if (requested.length === 0) {
      return {
        terminated: 0,
        failed: [],
        skipped: [],
        detail: 'No process IDs provided'
      }
    }

    const live = await this.adapter.listProcesses(80)
    const byPid = new Map(live.map((p) => [p.pid, p]))
    const allowed: number[] = []
    const skipped: Array<{ pid: number; reason: string }> = []

    for (const pid of requested) {
      const info = byPid.get(pid)
      if (!info) {
        skipped.push({ pid, reason: 'Process is no longer running' })
        continue
      }
      if (!info.safeToTerminate) {
        skipped.push({ pid, reason: `Protected process (${info.name})` })
        continue
      }
      allowed.push(pid)
    }

    if (allowed.length === 0) {
      return {
        terminated: 0,
        failed: [],
        skipped,
        detail: 'No safe processes available to stop'
      }
    }

    log.info('Terminating background processes', allowed)
    const result = await this.adapter.terminateProcesses(allowed)

    return {
      terminated: result.terminated,
      failed: result.failed,
      skipped,
      detail: result.detail
    }
  }

  async getSnapshot(): Promise<BoostSnapshot> {
    const [topProcesses, diskPressure] = await Promise.all([
      this.adapter.listProcesses(10),
      this.adapter.getDiskPressure()
    ])

    return {
      memory: getMemoryInfo(),
      topProcesses,
      diskPressure,
      platform: this.adapter.platformId
    }
  }

  async analyze(signal?: AbortSignal): Promise<BoostAnalysis> {
    log.info('Analyzing system for Boost opportunities')
    const memory = getMemoryInfo()
    const warnings: string[] = []
    const unsupportedOperations: BoostAnalysis['unsupportedOperations'] = []

    const [diskPressure, processes, startupSuggestions, tempDirs, cacheDirs] =
      await Promise.all([
        this.adapter.getDiskPressure(),
        this.adapter.listProcesses(100),
        this.adapter.supportsStartupEnumeration()
          ? this.adapter.listStartupApps()
          : Promise.resolve([]),
        this.collectTempDirectories(),
        this.adapter.getCacheDirectories()
      ])

    if (signal?.aborted) {
      throw new Error('Analysis cancelled')
    }

    let estimatedTempBytes = 0
    for (const dir of tempDirs) {
      estimatedTempBytes += await estimateDirectorySize(dir, signal, 2_000)
    }

    let estimatedCacheBytes = 0
    // Cap cache estimate to a few directories to keep analysis responsive
    for (const dir of cacheDirs.slice(0, 4)) {
      estimatedCacheBytes += await estimateDirectorySize(dir, signal, 1_500)
    }

    if (diskPressure?.isLow) {
      warnings.push(
        `Low disk space on ${diskPressure.mountPath} (${Math.round(diskPressure.freeBytes / (1024 ** 3))} GB free).`
      )
    }

    if (this.adapter.platformId === 'unsupported') {
      warnings.push('Boost runs with limited capabilities on this operating system.')
    }

    const availableOperations: BoostOperationId[] = ['clean-temp', 'refresh-stats']
    if (cacheDirs.length > 0) {
      availableOperations.push('clean-cache')
    } else {
      unsupportedOperations.push({
        id: 'clean-cache',
        reason: 'No safe application cache directories were found'
      })
    }

    if (this.adapter.supportsEmptyTrash()) {
      availableOperations.push('empty-trash')
    } else {
      unsupportedOperations.push({
        id: 'empty-trash',
        reason: 'Empty trash is not supported on this platform'
      })
    }

    if (this.adapter.supportsDnsFlush()) {
      availableOperations.push('flush-dns')
    } else {
      unsupportedOperations.push({
        id: 'flush-dns',
        reason: 'DNS flush is not supported on this platform'
      })
    }

    // Prefer user apps with meaningful memory use; keep enough entries that
    // lighter apps (e.g. WhatsApp) still appear — not only the top few browsers/IDEs.
    const processSuggestions = filterBackgroundProcesses(this.applyCpuPercents(processes))
    if (processSuggestions.length > 0) {
      availableOperations.push('terminate-processes')
    }

    if (!this.adapter.supportsStartupEnumeration()) {
      unsupportedOperations.push({
        id: 'terminate-processes',
        reason: 'Startup enumeration unavailable (suggestions limited)'
      })
    }

    const highImpactStartup = startupSuggestions.filter(
      (app) => app.enabled && (app.impact === 'high' || app.impact === 'medium')
    )

    if (highImpactStartup.length > 0) {
      warnings.push(
        `${highImpactStartup.length} startup item(s) may slow boot. Review them below — Boost does not disable startup apps automatically.`
      )
    }

    return {
      generatedAt: Date.now(),
      memory,
      diskPressure,
      estimatedTempBytes,
      estimatedCacheBytes,
      trashSupported: this.adapter.supportsEmptyTrash(),
      dnsFlushSupported: this.adapter.supportsDnsFlush(),
      processSuggestions,
      startupSuggestions: startupSuggestions.slice(0, 20),
      availableOperations,
      unsupportedOperations,
      warnings
    }
  }

  async execute(
    options: BoostOptions = {},
    onProgress?: BoostProgressListener
  ): Promise<BoostResult> {
    if (this.running) {
      throw new Error('A Boost operation is already running')
    }

    this.running = true
    this.abortController = new AbortController()
    const signal = this.abortController.signal
    const startedAt = Date.now()

    const emit = (event: BoostProgressEvent): void => {
      onProgress?.(event)
    }

    const steps: BoostStepResult[] = []
    const skipped: BoostSkippedOp[] = []
    const warnings: string[] = []

    const memoryBefore = getMemoryInfo()
    let tempFilesRemovedBytes = 0
    let cacheFilesRemovedBytes = 0
    let processesTerminated = 0
    let dnsFlushed = false
    let trashEmptied = false
    let cancelled = false

    const opts: Required<
      Pick<
        BoostOptions,
        'cleanTempFiles' | 'cleanAppCaches' | 'emptyTrash' | 'flushDnsCache'
      >
    > & { terminateProcessIds: number[] } = {
      cleanTempFiles: options.cleanTempFiles ?? true,
      cleanAppCaches: options.cleanAppCaches ?? true,
      emptyTrash: options.emptyTrash ?? false,
      flushDnsCache: options.flushDnsCache ?? true,
      terminateProcessIds: options.terminateProcessIds ?? []
    }

    try {
      emit({ phase: 'analyzing', message: 'Preparing Boost…', percent: 5 })

      // --- Temp files ---
      if (opts.cleanTempFiles) {
        emit({
          phase: 'cleaning-temp',
          message: 'Cleaning temporary files…',
          percent: 15
        })
        const step = await this.runCleanTemp(signal, emit)
        steps.push(step)
        tempFilesRemovedBytes += step.bytesFreed ?? 0
        if (step.status === 'cancelled') cancelled = true
      } else {
        skipped.push({ id: 'clean-temp', reason: 'Disabled by user options' })
      }

      if (signal.aborted) cancelled = true

      // --- App caches ---
      if (!cancelled && opts.cleanAppCaches) {
        emit({
          phase: 'cleaning-cache',
          message: 'Cleaning application caches…',
          percent: 40
        })
        const step = await this.runCleanCaches(signal, emit)
        steps.push(step)
        cacheFilesRemovedBytes += step.bytesFreed ?? 0
        if (step.status === 'cancelled') cancelled = true
      } else if (!opts.cleanAppCaches) {
        skipped.push({ id: 'clean-cache', reason: 'Disabled by user options' })
      }

      if (signal.aborted) cancelled = true

      // --- Trash ---
      if (!cancelled && opts.emptyTrash) {
        if (!this.adapter.supportsEmptyTrash()) {
          skipped.push({
            id: 'empty-trash',
            reason: 'Not supported on this platform'
          })
        } else {
          emit({
            phase: 'emptying-trash',
            message: 'Emptying trash…',
            percent: 60
          })
          const trash = await this.adapter.emptyTrash(signal)
          steps.push({
            id: 'empty-trash',
            label: 'Empty trash',
            status: trash.emptied ? 'completed' : 'failed',
            detail: trash.detail,
            error: trash.error
          })
          trashEmptied = trash.emptied
          if (trash.error) warnings.push(trash.error)
        }
      } else if (!opts.emptyTrash) {
        skipped.push({
          id: 'empty-trash',
          reason: 'Skipped (requires explicit confirmation)'
        })
      }

      if (signal.aborted) cancelled = true

      // --- Optional process termination ---
      if (!cancelled && opts.terminateProcessIds.length > 0) {
        emit({
          phase: 'terminating-processes',
          message: 'Stopping selected background processes…',
          percent: 75
        })
        const term = await this.adapter.terminateProcesses(
          opts.terminateProcessIds,
          signal
        )
        processesTerminated = term.terminated
        steps.push({
          id: 'terminate-processes',
          label: 'Background processes',
          status: term.terminated > 0 ? 'completed' : 'failed',
          detail: term.detail,
          processesAffected: term.terminated,
          error: term.failed[0]?.error
        })
        for (const fail of term.failed) {
          warnings.push(`PID ${fail.pid}: ${fail.error}`)
        }
      } else {
        skipped.push({
          id: 'terminate-processes',
          reason: 'No processes selected for termination'
        })
      }

      if (signal.aborted) cancelled = true

      // --- DNS flush ---
      if (!cancelled && opts.flushDnsCache) {
        if (!this.adapter.supportsDnsFlush()) {
          skipped.push({
            id: 'flush-dns',
            reason: 'Not supported on this platform'
          })
        } else {
          emit({
            phase: 'flushing-dns',
            message: 'Flushing DNS cache…',
            percent: 88
          })
          const dns = await this.adapter.flushDnsCache(signal)
          dnsFlushed = dns.flushed
          steps.push({
            id: 'flush-dns',
            label: 'Flush DNS cache',
            status: dns.flushed ? 'completed' : 'skipped',
            detail: dns.detail,
            error: dns.error
          })
          if (dns.error) warnings.push(dns.error)
        }
      } else if (!opts.flushDnsCache) {
        skipped.push({ id: 'flush-dns', reason: 'Disabled by user options' })
      }

      emit({
        phase: 'finalizing',
        message: 'Refreshing system statistics…',
        percent: 96
      })

      // Brief pause so OS memory counters can settle after process exits
      await new Promise((r) => setTimeout(r, 400))

      steps.push({
        id: 'refresh-stats',
        label: 'Refresh statistics',
        status: 'completed',
        detail: 'Memory and disk statistics refreshed'
      })

      emit({ phase: 'finalizing', message: 'Boost complete', percent: 100 })
    } catch (err) {
      log.error('Boost execute failed', err)
      warnings.push(err instanceof Error ? err.message : 'Boost failed unexpectedly')
      if (signal.aborted) cancelled = true
    } finally {
      this.running = false
      this.abortController = null
    }

    const memoryAfter = getMemoryInfo()
    const memoryReclaimedBytes = Math.max(0, memoryAfter.free - memoryBefore.free)
    const diskFreedBytes = tempFilesRemovedBytes + cacheFilesRemovedBytes
    const durationMs = Date.now() - startedAt

    const result: BoostResult = {
      success: !cancelled && warnings.length === 0,
      cancelled,
      durationMs,
      memoryBeforeBytes: memoryBefore.free,
      memoryAfterBytes: memoryAfter.free,
      memoryReclaimedBytes,
      tempFilesRemovedBytes,
      cacheFilesRemovedBytes,
      diskFreedBytes,
      processesTerminated,
      dnsFlushed,
      trashEmptied,
      steps,
      skipped,
      warnings
    }

    // success if we completed meaningful work even with soft warnings
    if (!cancelled && (diskFreedBytes > 0 || processesTerminated > 0 || dnsFlushed || trashEmptied)) {
      result.success = true
    } else if (!cancelled && steps.some((s) => s.status === 'completed')) {
      result.success = true
    }

    log.info('Boost finished', {
      durationMs,
      diskFreedBytes,
      memoryReclaimedBytes,
      cancelled
    })

    return result
  }

  private async collectTempDirectories(): Promise<string[]> {
    const electronTemp = app.getPath('temp')
    const platformTemps = await this.adapter.getTempDirectories()
    const dirs = uniquePaths([electronTemp, ...platformTemps])
    const existing: string[] = []
    for (const dir of dirs) {
      if (await pathExists(dir)) existing.push(dir)
    }
    return existing
  }

  private async runCleanTemp(
    signal: AbortSignal,
    emit: BoostProgressListener
  ): Promise<BoostStepResult> {
    const dirs = await this.collectTempDirectories()
    if (dirs.length === 0) {
      return {
        id: 'clean-temp',
        label: 'Temporary files',
        status: 'skipped',
        detail: 'No temporary directories found'
      }
    }

    let bytesFreed = 0
    const errors: string[] = []

    for (const dir of dirs) {
      if (signal.aborted) {
        return {
          id: 'clean-temp',
          label: 'Temporary files',
          status: 'cancelled',
          detail: 'Cancelled while cleaning temp files',
          bytesFreed
        }
      }
      emit({
        phase: 'cleaning-temp',
        message: 'Cleaning temporary files…',
        percent: 20,
        currentItem: dir
      })
      const cleaned = await cleanDirectoryContents(dir, signal)
      bytesFreed += cleaned.bytesRemoved
      errors.push(...cleaned.errors.slice(0, 10))
    }

    return {
      id: 'clean-temp',
      label: 'Temporary files',
      status: errors.length > 0 && bytesFreed === 0 ? 'failed' : 'completed',
      detail: `Removed ${bytesFreed} bytes from ${dirs.length} location(s)`,
      bytesFreed,
      error: errors[0]
    }
  }

  private async runCleanCaches(
    signal: AbortSignal,
    emit: BoostProgressListener
  ): Promise<BoostStepResult> {
    const dirs = (await this.adapter.getCacheDirectories()).slice(0, 6)
    if (dirs.length === 0) {
      return {
        id: 'clean-cache',
        label: 'Application caches',
        status: 'skipped',
        detail: 'No cache directories found'
      }
    }

    let bytesFreed = 0
    const errors: string[] = []

    for (const dir of dirs) {
      if (signal.aborted) {
        return {
          id: 'clean-cache',
          label: 'Application caches',
          status: 'cancelled',
          detail: 'Cancelled while cleaning caches',
          bytesFreed
        }
      }
      emit({
        phase: 'cleaning-cache',
        message: 'Cleaning application caches…',
        percent: 50,
        currentItem: dir
      })
      // Only clean known *Cache* leaf folders — avoid wiping entire ~/.cache root on Linux
      const base = dir.replace(/[/\\]+$/, '').toLowerCase()
      const isBroadRoot =
        base.endsWith(`${'/.cache'}`) ||
        base.endsWith('\\temp') ||
        /[/\\]caches$/i.test(dir)

      if (isBroadRoot && process.platform === 'linux' && dir.endsWith('.cache')) {
        // Skip wiping entire ~/.cache — too aggressive
        errors.push(`Skipped broad cache root: ${dir}`)
        continue
      }

      if (isBroadRoot && process.platform === 'darwin' && /Library[/\\]Caches$/i.test(dir)) {
        errors.push(`Skipped broad cache root: ${dir}`)
        continue
      }

      const cleaned = await cleanDirectoryContents(dir, signal, 5_000)
      bytesFreed += cleaned.bytesRemoved
      errors.push(...cleaned.errors.slice(0, 10))
    }

    return {
      id: 'clean-cache',
      label: 'Application caches',
      status: bytesFreed > 0 ? 'completed' : errors.length ? 'skipped' : 'completed',
      detail: `Removed ${bytesFreed} bytes from cache locations`,
      bytesFreed,
      error: bytesFreed === 0 ? errors[0] : undefined
    }
  }
}

export const boostService = new BoostService()

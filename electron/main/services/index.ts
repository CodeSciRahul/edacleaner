import { app, BrowserWindow, type WebContents } from 'electron'
import os from 'os'
import { Platform } from '@shared/enums'
import { IPC_CHANNELS } from '@shared/constants'
import type { SystemInfo, MemoryInfo, SystemMetricsSample } from '@shared/interfaces'
import { createLogger } from '@main/utils/logger'

const log = createLogger('SystemService')

const METRICS_WATCH_INTERVAL_MS = 1000

function readCpuTimes(): { idle: number; total: number } {
  let idle = 0
  let total = 0
  for (const cpu of os.cpus()) {
    const t = cpu.times
    idle += t.idle
    total += t.user + t.nice + t.sys + t.idle + t.irq
  }
  return { idle, total }
}

export class SystemService {
  private readonly metricsWatchers = new Map<number, WebContents>()
  private metricsWatchTimer: NodeJS.Timeout | null = null
  private previousCpuTimes: { idle: number; total: number } | null = null

  getInfo(): SystemInfo {
    return {
      platform: process.platform as Platform,
      arch: process.arch,
      hostname: os.hostname(),
      osVersion: os.release(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length
    }
  }

  getMemory(): MemoryInfo {
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

  /**
   * One-shot metrics sample. CPU % is 0 until a prior sample exists
   * (call again ~1s later, or use the metrics watch).
   */
  getMetricsSample(): SystemMetricsSample {
    return this.captureMetricsSample()
  }

  startMetricsWatch(webContents: WebContents): { watching: boolean } {
    if (webContents.isDestroyed()) {
      return { watching: false }
    }

    this.metricsWatchers.set(webContents.id, webContents)
    log.info('Metrics watch started', {
      id: webContents.id,
      watchers: this.metricsWatchers.size
    })

    if (!this.metricsWatchTimer) {
      this.metricsWatchTimer = setInterval(() => {
        this.tickMetricsWatch()
      }, METRICS_WATCH_INTERVAL_MS)
      this.tickMetricsWatch()
    }

    return { watching: true }
  }

  stopMetricsWatch(webContents: WebContents): { watching: boolean } {
    this.metricsWatchers.delete(webContents.id)
    log.info('Metrics watch stopped', {
      id: webContents.id,
      watchers: this.metricsWatchers.size
    })

    if (this.metricsWatchers.size === 0) {
      this.clearMetricsWatchTimer()
      this.previousCpuTimes = null
    }

    return { watching: this.metricsWatchers.size > 0 }
  }

  private clearMetricsWatchTimer(): void {
    if (this.metricsWatchTimer) {
      clearInterval(this.metricsWatchTimer)
      this.metricsWatchTimer = null
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

  private captureMetricsSample(): SystemMetricsSample {
    const memory = this.getMemory()
    const current = readCpuTimes()
    let cpuPercent = 0

    const prev = this.previousCpuTimes
    if (prev) {
      const idleDelta = current.idle - prev.idle
      const totalDelta = current.total - prev.total
      if (totalDelta > 0) {
        cpuPercent = Math.min(
          100,
          Math.max(0, Math.round((1 - idleDelta / totalDelta) * 1000) / 10)
        )
      }
    }

    this.previousCpuTimes = current

    return {
      at: Date.now(),
      cpuPercent,
      memoryPercent: memory.usedPercent,
      memory
    }
  }

  private tickMetricsWatch(): void {
    if (this.metricsWatchers.size === 0) return

    const active: WebContents[] = []
    for (const [id, wc] of this.metricsWatchers) {
      if (wc.isDestroyed()) {
        this.metricsWatchers.delete(id)
        continue
      }
      if (this.shouldSampleWatcher(wc)) {
        active.push(wc)
      }
    }

    if (this.metricsWatchers.size === 0) {
      this.clearMetricsWatchTimer()
      this.previousCpuTimes = null
      return
    }

    if (active.length === 0) {
      return
    }

    const sample = this.captureMetricsSample()
    for (const wc of active) {
      if (!wc.isDestroyed()) {
        wc.send(IPC_CHANNELS.SYSTEM.METRICS_UPDATE, sample)
      }
    }
  }
}

export class AppService {
  getVersion(): string {
    return app.getVersion()
  }

  getPlatform(): Platform {
    return process.platform as Platform
  }

  quit(): void {
    app.quit()
  }

  relaunch(): void {
    app.relaunch()
    app.exit(0)
  }

  getPath(name: Parameters<typeof app.getPath>[0]): string {
    return app.getPath(name)
  }
}

export class SettingsService {
  private store: Map<string, unknown> = new Map()

  get<T>(key: string, defaultValue?: T): T | undefined {
    if (this.store.has(key)) {
      return this.store.get(key) as T
    }
    return defaultValue
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value)
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.store)
  }

  reset(): void {
    this.store.clear()
  }
}

export class UpdaterService {
  private status = 'idle' as const

  checkForUpdates(): { status: string; message: string } {
    return {
      status: this.status,
      message: 'Auto-update module ready for integration'
    }
  }

  getStatus(): { status: string } {
    return { status: this.status }
  }
}

export const systemService = new SystemService()
export const appService = new AppService()
export const settingsService = new SettingsService()
export const updaterService = new UpdaterService()

export { storageService, StorageService } from './storage-service'
export { boostService, BoostService } from './boost'
export { startupService, StartupService } from './startup'

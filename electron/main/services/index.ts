import { app } from 'electron'
import os from 'os'
import { Platform } from '@shared/enums'
import type { SystemInfo, MemoryInfo } from '@shared/interfaces'

export class SystemService {
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

/*
 * =============================================================================
 * SERVICES — Business logic layer (asli kaam yahan hota hai)
 * =============================================================================
 *
 * IPC (ipc/index.ts)  →  sirf routing + req/res format
 *                         - kaunsi request kis handler tak jayegi (channel match)
 *                         - success({ data }) / failure({ error }) wrap karke jawab bhejna
 *
 * Service (yahan)     →  actual business logic
 *                         - version, memory, settings, updates ka real kaam
 *                         - Electron/Node APIs (app, os, fs) yahan use hote hain
 *
 * Flow:  Preload invoke → ipcMain.handle → service.method() → return → preload → React
 *
 * Kyun alag?
 *   - IPC patla rahe (1 line: service call + success wrap)
 *   - Logic ek jagah — test, reuse, badhana easy
 *   - Singleton exports (appService, etc.) — poori app mein same instance
 */

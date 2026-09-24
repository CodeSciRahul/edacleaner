import { net } from 'electron'
import { createLogger } from '@main/utils/logger'
import type { NetworkStatus, NetworkStatusSnapshot } from '@shared/interfaces'

const log = createLogger('Connectivity')

const DEFAULT_POLL_MS = 15_000

export type ConnectivityListener = (snapshot: NetworkStatusSnapshot) => void

/**
 * Cross-platform connectivity probing.
 * Uses Electron `net.isOnline()` only — no Node dns/c-ares and no Chromium
 * `net.fetch` probe. Periodic HTTP probes previously correlated with
 * FATAL NOTREACHED crashes on some macOS / nested-Electron environments;
 * probe failure was already treated as soft-online, so status is unchanged.
 */
export class ConnectivityService {
  private status: NetworkStatus = 'unknown'
  private lastCheckedAt = 0
  private lastError: string | null = null
  private pollTimer: NodeJS.Timeout | null = null
  private readonly listeners = new Set<ConnectivityListener>()
  private checking = false

  getSnapshot(): NetworkStatusSnapshot {
    return {
      status: this.status,
      online: this.status === 'online',
      lastCheckedAt: this.lastCheckedAt,
      lastError: this.lastError
    }
  }

  isOnline(): boolean {
    return this.status === 'online'
  }

  onChange(listener: ConnectivityListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  start(pollIntervalMs = DEFAULT_POLL_MS): void {
    if (this.pollTimer) return

    void this.check()
    this.pollTimer = setInterval(() => {
      void this.check()
    }, pollIntervalMs)
    this.pollTimer.unref?.()

    log.info('Connectivity monitoring started', { pollIntervalMs })
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    log.info('Connectivity monitoring stopped')
  }

  async check(): Promise<NetworkStatusSnapshot> {
    if (this.checking) return this.getSnapshot()
    this.checking = true

    try {
      const electronOnline = net.isOnline()
      this.applyStatus(electronOnline ? 'online' : 'offline', null)
      return this.getSnapshot()
    } finally {
      this.checking = false
    }
  }

  private applyStatus(status: NetworkStatus, error: string | null): void {
    const changed = this.status !== status
    this.status = status
    this.lastCheckedAt = Date.now()
    this.lastError = error

    if (changed) {
      log.info('Network status changed', { status, error })
      const snapshot = this.getSnapshot()
      for (const listener of this.listeners) {
        try {
          listener(snapshot)
        } catch (listenerError) {
          log.error('Connectivity listener failed', listenerError)
        }
      }
    }
  }
}

export const connectivityService = new ConnectivityService()

import { BrowserWindow, type WebContents } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { NetworkStatusSnapshot } from '@shared/interfaces'
import { createLogger } from '@main/utils/logger'
import { connectivityService } from './connectivity-service'

const log = createLogger('NetworkStatusObserver')

/**
 * Pushes network status changes from ConnectivityService to renderer windows.
 */
export class NetworkStatusObserver {
  private unsubscribe: (() => void) | null = null
  private readonly watchers = new Set<number>()

  start(): void {
    if (this.unsubscribe) return

    this.unsubscribe = connectivityService.onChange((snapshot) => {
      this.broadcast(snapshot)
    })

    log.info('Network status observer started')
  }

  stop(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.watchers.clear()
    log.info('Network status observer stopped')
  }

  /** Register a webContents to receive status push events. */
  watch(webContents: WebContents): { watching: boolean } {
    if (webContents.isDestroyed()) {
      return { watching: false }
    }

    this.watchers.add(webContents.id)
    webContents.once('destroyed', () => {
      this.watchers.delete(webContents.id)
    })

    // Send current snapshot immediately so UI is not stuck on "unknown".
    if (!webContents.isDestroyed()) {
      webContents.send(
        IPC_CHANNELS.OFFLINE.NETWORK_STATUS_CHANGED,
        connectivityService.getSnapshot()
      )
    }

    return { watching: true }
  }

  unwatch(webContents: WebContents): { watching: boolean } {
    this.watchers.delete(webContents.id)
    return { watching: this.watchers.size > 0 }
  }

  private broadcast(snapshot: NetworkStatusSnapshot): void {
    for (const win of BrowserWindow.getAllWindows()) {
      const wc = win.webContents
      if (wc.isDestroyed()) continue
      if (this.watchers.size > 0 && !this.watchers.has(wc.id)) continue

      wc.send(IPC_CHANNELS.OFFLINE.NETWORK_STATUS_CHANGED, snapshot)
    }
  }
}

export const networkStatusObserver = new NetworkStatusObserver()

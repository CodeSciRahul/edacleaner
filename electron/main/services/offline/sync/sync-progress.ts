import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { SyncProgressEvent } from '@shared/interfaces'
import { createLogger } from '@main/utils/logger'

const log = createLogger('SyncProgress')

export type SyncProgressListener = (event: SyncProgressEvent) => void

/**
 * Broadcasts sync progress to renderer windows without blocking the main loop.
 */
export class SyncProgressReporter {
  private readonly listeners = new Set<SyncProgressListener>()
  private lastEvent: SyncProgressEvent | null = null

  getLastEvent(): SyncProgressEvent | null {
    return this.lastEvent
  }

  onProgress(listener: SyncProgressListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(event: SyncProgressEvent): void {
    this.lastEvent = event
    log.debug('Sync progress', {
      phase: event.phase,
      percent: event.percent,
      processed: event.processed,
      total: event.total,
      message: event.message
    })

    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        log.error('Sync progress listener failed', error)
      }
    }

    // Fire-and-forget IPC — never await renderer.
    queueMicrotask(() => {
      for (const win of BrowserWindow.getAllWindows()) {
        const wc = win.webContents
        if (wc.isDestroyed()) continue
        wc.send(IPC_CHANNELS.SYNC.PROGRESS, event)
      }
    })
  }
}

export const syncProgressReporter = new SyncProgressReporter()

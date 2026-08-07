import { createLogger } from '@main/utils/logger'
import type { OfflineQueueItem, SyncRunResult } from '@shared/interfaces'
import { syncEngine } from '../sync/sync-engine'
import { queueService } from './queue-service'

const log = createLogger('QueueProcessor')

/**
 * Queue processor facade — delegates to SyncEngine for actual network replay.
 * Keeps the historical QueueProcessor API used by offline bootstrap.
 */
export class QueueProcessor {
  get isRunning(): boolean {
    return syncEngine.isRunning
  }

  async processNext(): Promise<OfflineQueueItem | null> {
    const before = queueService.listReadyForSync(1)[0] ?? null
    if (!before) {
      log.debug('No ready queue items')
      return null
    }

    await syncEngine.synchronize({ batchSize: 1, reason: 'process-next' })
    return queueService.getById(before.id)
  }

  async processAll(limit = 50): Promise<{ processed: number; remaining: number }> {
    const result = await syncEngine.synchronize({
      batchSize: limit,
      reason: 'process-all'
    })
    return {
      processed: result.succeeded + result.failed + result.skipped,
      remaining: result.remaining
    }
  }

  /** Connectivity hook — triggers background sync when the network returns. */
  onNetworkOnline(): void {
    log.info('Network online — scheduling queue synchronization')
    syncEngine.scheduleSync('connectivity-restored')
  }

  synchronize(reason = 'manual'): Promise<SyncRunResult> {
    return syncEngine.synchronize({ reason })
  }

  cancel(): void {
    syncEngine.cancel()
  }
}

export const queueProcessor = new QueueProcessor()

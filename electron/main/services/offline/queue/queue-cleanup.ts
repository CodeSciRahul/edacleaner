import { createLogger } from '@main/utils/logger'
import type { OfflineQueueStatus } from '@shared/interfaces'
import { queueRepository } from './queue-repository'

const log = createLogger('QueueCleanup')

const DEFAULT_RETENTION_DAYS = 14
const TERMINAL_STATUSES: OfflineQueueStatus[] = [
  'completed',
  'failed',
  'cancelled',
  'abandoned'
]

export interface QueueCleanupResult {
  deleted: number
  retentionDays: number
  olderThan: string
}

/**
 * Removes terminal queue rows older than the retention window.
 * Pending / processing items are never deleted by cleanup.
 */
export class QueueCleanup {
  run(retentionDays = DEFAULT_RETENTION_DAYS): QueueCleanupResult {
    const days = Math.max(1, Math.floor(retentionDays))
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const olderThan = cutoff.toISOString()

    const deleted = queueRepository.deleteByStatuses(TERMINAL_STATUSES, olderThan)

    if (deleted > 0) {
      log.info('Cleaned offline request queue', { deleted, retentionDays: days })
    } else {
      log.debug('Queue cleanup — nothing to remove', { retentionDays: days })
    }

    return {
      deleted,
      retentionDays: days,
      olderThan
    }
  }
}

export const queueCleanup = new QueueCleanup()

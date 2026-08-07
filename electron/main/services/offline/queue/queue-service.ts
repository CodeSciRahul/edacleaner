import { randomUUID } from 'crypto'
import { createLogger } from '@main/utils/logger'
import { stripSensitiveHeaders } from '../security/sanitize-headers'
import type {
  ApiHttpMethod,
  ApiRequestConfig,
  OfflineQueueEnqueueInput,
  OfflineQueueItem,
  OfflineQueueMethod,
  OfflineQueueStats
} from '@shared/interfaces'
import { buildQueryString, buildRequestUrl, resolveApiBaseUrl } from '../../api/api-cache-layer'
import {
  computeRequestFingerprint,
  queueRepository
} from './queue-repository'

const log = createLogger('QueueService')

const QUEUEABLE_METHODS = new Set<OfflineQueueMethod>([
  'POST',
  'PUT',
  'PATCH',
  'DELETE'
])

const IDEMPOTENCY_HEADER = 'Idempotency-Key'
const MAX_ACTIVE_QUEUE_ITEMS = 500
const MAX_BODY_BYTES = 256 * 1024

/**
 * Offline request queue service.
 * Persists mutating API calls while offline with duplicate detection + idempotency keys.
 */
export class QueueService {
  isQueueableMethod(method: ApiHttpMethod): method is OfflineQueueMethod {
    return QUEUEABLE_METHODS.has(method as OfflineQueueMethod)
  }

  shouldEnqueue(config: ApiRequestConfig, online: boolean): boolean {
    if (online) return false
    if (config.skipOfflineQueue) return false
    return this.isQueueableMethod(config.method)
  }

  enqueueFromApiConfig(config: ApiRequestConfig): OfflineQueueItem {
    if (!this.isQueueableMethod(config.method)) {
      throw new Error(`Method ${config.method} cannot be queued`)
    }

    const baseUrl = resolveApiBaseUrl()
    const url =
      buildRequestUrl(baseUrl, config.url) + buildQueryString(config.params)

    const headers = stripSensitiveHeaders(config.headers)
    delete headers['content-length']
    delete headers['Content-Length']

    const existingKey =
      headers[IDEMPOTENCY_HEADER] ?? headers['idempotency-key']
    if (!existingKey) {
      headers[IDEMPOTENCY_HEADER] = randomUUID()
    }

    return this.enqueue({
      url,
      method: config.method,
      headers,
      body: config.data ?? null
    })
  }

  enqueue(input: OfflineQueueEnqueueInput): OfflineQueueItem {
    if (!this.isQueueableMethod(input.method)) {
      throw new Error(`Method ${input.method} cannot be queued`)
    }
    if (typeof input.url !== 'string' || !input.url.trim()) {
      throw new Error('Queue item URL is required')
    }

    const active = queueRepository.countActive()
    if (active >= MAX_ACTIVE_QUEUE_ITEMS) {
      throw new Error(
        `Offline queue is full (${MAX_ACTIVE_QUEUE_ITEMS} active items)`
      )
    }

    this.assertBodySize(input.body)

    const url = input.url.trim()
    const headers = stripSensitiveHeaders(input.headers)
    if (!headers[IDEMPOTENCY_HEADER] && !headers['idempotency-key']) {
      headers[IDEMPOTENCY_HEADER] = randomUUID()
    }

    const fingerprint =
      input.fingerprint ??
      computeRequestFingerprint(input.method, url, input.body ?? null)

    const duplicate = queueRepository.findActiveDuplicate(fingerprint)
    if (duplicate) {
      log.info('Duplicate request suppressed — returning existing queue item', {
        existingId: duplicate.id,
        method: input.method,
        url
      })
      return duplicate
    }

    const item = queueRepository.create({
      url,
      method: input.method,
      headers,
      body: input.body ?? null,
      fingerprint
    })

    log.info('Request queued for offline replay', {
      id: item.id,
      method: item.method,
      url: item.url,
      fingerprint: item.fingerprint
    })

    return item
  }

  getById(id: string): OfflineQueueItem | null {
    return queueRepository.findById(id)
  }

  listPending(limit = 100): OfflineQueueItem[] {
    return queueRepository.listPending(limit)
  }

  listReadyForSync(limit = 50): OfflineQueueItem[] {
    return queueRepository.listReadyForSync(limit)
  }

  listAll(limit = 200): OfflineQueueItem[] {
    return queueRepository.listAll(limit)
  }

  getStats(): OfflineQueueStats {
    return queueRepository.getStats()
  }

  cancel(id: string): OfflineQueueItem | null {
    const existing = queueRepository.findById(id)
    if (!existing) return null
    if (
      existing.status === 'completed' ||
      existing.status === 'cancelled' ||
      existing.status === 'abandoned'
    ) {
      return existing
    }

    const updated = queueRepository.updateStatus(id, 'cancelled', {
      nextRetryAt: null
    })
    log.info('Queue item cancelled', { id })
    return updated
  }

  abandon(id: string, reason: string): OfflineQueueItem | null {
    const updated = queueRepository.updateStatus(id, 'abandoned', {
      lastError: reason,
      nextRetryAt: null
    })
    if (updated) {
      log.warn('Queue item abandoned', { id, reason })
    }
    return updated
  }

  markPending(id: string): OfflineQueueItem | null {
    return queueRepository.updateStatus(id, 'pending', { nextRetryAt: null })
  }

  markProcessing(id: string): OfflineQueueItem | null {
    return queueRepository.updateStatus(id, 'processing')
  }

  markCompleted(id: string): OfflineQueueItem | null {
    return queueRepository.updateStatus(id, 'completed', {
      lastError: null,
      nextRetryAt: null
    })
  }

  markFailed(
    id: string,
    error: string,
    nextRetryAt: string | null = null
  ): OfflineQueueItem | null {
    return queueRepository.updateStatus(id, 'failed', {
      lastError: error,
      incrementRetry: true,
      nextRetryAt
    })
  }

  /** Recover rows left in `processing` after an unexpected quit. */
  recoverInterrupted(): number {
    const count = queueRepository.resetProcessingToPending()
    if (count > 0) {
      log.warn('Reset interrupted queue items to pending', { count })
    }
    return count
  }

  private assertBodySize(body: unknown): void {
    if (body === undefined || body === null) return
    try {
      const raw = typeof body === 'string' ? body : JSON.stringify(body)
      if (raw.length > MAX_BODY_BYTES) {
        throw new Error(
          `Queue body exceeds ${MAX_BODY_BYTES} bytes (got ${raw.length})`
        )
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Queue body')) {
        throw error
      }
      throw new Error('Queue body is not serializable')
    }
  }
}

export const queueService = new QueueService()

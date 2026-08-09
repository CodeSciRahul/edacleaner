import { createHash, randomUUID } from 'crypto'
import { BaseRepository } from '../repositories/base-repository'
import { stableStringify } from '@main/utils/stable-stringify'
import type {
  OfflineQueueItem,
  OfflineQueueMethod,
  OfflineQueueStatus,
  OfflineQueueStats
} from '@shared/interfaces'

interface RequestQueueRow {
  id: string
  url: string
  method: string
  headers: string
  body: string | null
  retry_count: number
  status: string
  created_at: string
  updated_at: string
  last_error: string | null
  fingerprint: string | null
  next_retry_at: string | null
}

export interface CreateQueueRowInput {
  url: string
  method: OfflineQueueMethod
  headers: Record<string, string>
  body: unknown | null
  fingerprint: string
}

/**
 * Durable repository for the offline request queue.
 * Survives app restarts via SQLite (sql.js) persistence.
 */
export class QueueRepository extends BaseRepository {
  create(input: CreateQueueRowInput): OfflineQueueItem {
    const id = randomUUID()
    const now = this.nowIso()
    const headersJson = JSON.stringify(input.headers ?? {})
    const bodyJson =
      input.body === undefined || input.body === null
        ? null
        : JSON.stringify(input.body)

    this.run(
      `INSERT INTO request_queue
        (id, url, method, headers, body, retry_count, status, created_at, updated_at,
         last_error, fingerprint, next_retry_at)
       VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?, NULL, ?, NULL);`,
      [
        id,
        input.url,
        input.method,
        headersJson,
        bodyJson,
        now,
        now,
        input.fingerprint
      ]
    )

    const item = this.findById(id)
    if (!item) {
      throw new Error('Failed to persist queue item')
    }
    return item
  }

  countActive(): number {
    const rows = this.queryAll<{ c: number }>(
      `SELECT COUNT(*) as c FROM request_queue
       WHERE status IN ('pending', 'processing', 'failed');`
    )
    return Number(rows[0]?.c ?? 0)
  }

  findById(id: string): OfflineQueueItem | null {
    const row = this.queryOne<RequestQueueRow>(
      `SELECT id, url, method, headers, body, retry_count, status,
              created_at, updated_at, last_error, fingerprint, next_retry_at
       FROM request_queue WHERE id = ? LIMIT 1;`,
      [id]
    )
    return row ? this.mapRow(row) : null
  }

  /** Active duplicate: pending or processing with the same fingerprint. */
  findActiveDuplicate(fingerprint: string): OfflineQueueItem | null {
    const row = this.queryOne<RequestQueueRow>(
      `SELECT id, url, method, headers, body, retry_count, status,
              created_at, updated_at, last_error, fingerprint, next_retry_at
       FROM request_queue
       WHERE fingerprint = ? AND status IN ('pending', 'processing')
       ORDER BY created_at ASC
       LIMIT 1;`,
      [fingerprint]
    )
    return row ? this.mapRow(row) : null
  }

  listByStatus(status: OfflineQueueStatus, limit = 100): OfflineQueueItem[] {
    const rows = this.queryAll<RequestQueueRow>(
      `SELECT id, url, method, headers, body, retry_count, status,
              created_at, updated_at, last_error, fingerprint, next_retry_at
       FROM request_queue
       WHERE status = ?
       ORDER BY created_at ASC
       LIMIT ?;`,
      [status, limit]
    )
    return rows.map((row) => this.mapRow(row))
  }

  listPending(limit = 100): OfflineQueueItem[] {
    return this.listByStatus('pending', limit)
  }

  /**
   * Items ready for sync: pending, or failed whose backoff window has elapsed.
   * Abandoned / cancelled / completed are never selected.
   */
  listReadyForSync(limit = 50, nowIso = new Date().toISOString()): OfflineQueueItem[] {
    const rows = this.queryAll<RequestQueueRow>(
      `SELECT id, url, method, headers, body, retry_count, status,
              created_at, updated_at, last_error, fingerprint, next_retry_at
       FROM request_queue
       WHERE status = 'pending'
          OR (status = 'failed' AND next_retry_at IS NOT NULL AND next_retry_at <= ?)
       ORDER BY created_at ASC
       LIMIT ?;`,
      [nowIso, limit]
    )
    return rows.map((row) => this.mapRow(row))
  }

  listAll(limit = 200): OfflineQueueItem[] {
    const rows = this.queryAll<RequestQueueRow>(
      `SELECT id, url, method, headers, body, retry_count, status,
              created_at, updated_at, last_error, fingerprint, next_retry_at
       FROM request_queue
       ORDER BY created_at DESC
       LIMIT ?;`,
      [limit]
    )
    return rows.map((row) => this.mapRow(row))
  }

  updateStatus(
    id: string,
    status: OfflineQueueStatus,
    options: {
      lastError?: string | null
      incrementRetry?: boolean
      nextRetryAt?: string | null
    } = {}
  ): OfflineQueueItem | null {
    const existing = this.findById(id)
    if (!existing) return null

    const retryCount = options.incrementRetry
      ? existing.retryCount + 1
      : existing.retryCount
    const lastError =
      options.lastError === undefined ? existing.lastError : options.lastError
    const nextRetryAt =
      options.nextRetryAt === undefined
        ? existing.nextRetryAt
        : options.nextRetryAt

    this.run(
      `UPDATE request_queue
       SET status = ?, retry_count = ?, last_error = ?, next_retry_at = ?, updated_at = ?
       WHERE id = ?;`,
      [status, retryCount, lastError, nextRetryAt, this.nowIso(), id]
    )

    return this.findById(id)
  }

  /** Reset interrupted processing rows after a crash/restart. */
  resetProcessingToPending(): number {
    const rows = this.queryAll<{ c: number }>(
      `SELECT COUNT(*) as c FROM request_queue WHERE status = 'processing';`
    )
    const count = Number(rows[0]?.c ?? 0)
    if (count === 0) return 0

    this.run(
      `UPDATE request_queue
       SET status = 'pending', updated_at = ?, last_error = ?, next_retry_at = NULL
       WHERE status = 'processing';`,
      [this.nowIso(), 'Reset after application restart']
    )
    return count
  }

  deleteById(id: string): boolean {
    const existing = this.findById(id)
    if (!existing) return false
    this.run('DELETE FROM request_queue WHERE id = ?;', [id])
    return true
  }

  deleteByStatuses(statuses: OfflineQueueStatus[], olderThanIso: string): number {
    if (statuses.length === 0) return 0

    const placeholders = statuses.map(() => '?').join(', ')
    const countRows = this.queryAll<{ c: number }>(
      `SELECT COUNT(*) as c FROM request_queue
       WHERE status IN (${placeholders}) AND updated_at < ?;`,
      [...statuses, olderThanIso]
    )
    const count = Number(countRows[0]?.c ?? 0)
    if (count === 0) return 0

    this.run(
      `DELETE FROM request_queue
       WHERE status IN (${placeholders}) AND updated_at < ?;`,
      [...statuses, olderThanIso]
    )
    return count
  }

  getStats(): OfflineQueueStats {
    const rows = this.queryAll<{ status: string; c: number }>(
      `SELECT status, COUNT(*) as c FROM request_queue GROUP BY status;`
    )

    const stats: OfflineQueueStats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      abandoned: 0,
      total: 0
    }

    for (const row of rows) {
      const count = Number(row.c)
      stats.total += count
      if (row.status === 'pending') stats.pending = count
      else if (row.status === 'processing') stats.processing = count
      else if (row.status === 'completed') stats.completed = count
      else if (row.status === 'failed') stats.failed = count
      else if (row.status === 'cancelled') stats.cancelled = count
      else if (row.status === 'abandoned') stats.abandoned = count
    }

    return stats
  }

  private mapRow(row: RequestQueueRow): OfflineQueueItem {
    let headers: Record<string, string> = {}
    try {
      headers = JSON.parse(row.headers) as Record<string, string>
    } catch {
      headers = {}
    }

    let body: unknown | null = null
    if (row.body != null) {
      try {
        body = JSON.parse(row.body)
      } catch {
        body = row.body
      }
    }

    return {
      id: row.id,
      url: row.url,
      method: row.method as OfflineQueueMethod,
      headers,
      body,
      retryCount: Number(row.retry_count),
      status: row.status as OfflineQueueStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastError: row.last_error,
      fingerprint: row.fingerprint ?? null,
      nextRetryAt: row.next_retry_at ?? null
    }
  }
}

export function computeRequestFingerprint(
  method: string,
  url: string,
  body: unknown | null
): string {
  const payload = `${method.toUpperCase()}|${url}|${stableStringify(body)}`
  return createHash('sha256').update(payload).digest('hex')
}

export const queueRepository = new QueueRepository()

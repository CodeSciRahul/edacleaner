import { createLogger } from '@main/utils/logger'
import { connectivityService } from '../connectivity-service'
import { queueService } from '../queue/queue-service'
import type {
  OfflineQueueItem,
  SyncProgressEvent,
  SyncRunResult
} from '@shared/interfaces'
import { resolveConflict } from './sync-conflict'
import { syncProgressReporter } from './sync-progress'

const log = createLogger('SyncEngine')

const DEFAULT_BATCH_SIZE = 20
const MAX_SYNC_RETRIES = 5
const BASE_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 5 * 60_000
const REQUEST_TIMEOUT_MS = 30_000
const ONLINE_DEBOUNCE_MS = 1_200
const BACKGROUND_POLL_MS = 60_000
const YIELD_MS = 0

export interface SyncEngineOptions {
  batchSize?: number
  includeFailed?: boolean
  reason?: string
}

/**
 * Background synchronization engine.
 *
 * - Detects connectivity via ConnectivityService
 * - Flushes the durable offline queue when online
 * - Processes batches sequentially (never parallel) to preserve order
 * - Yields to the event loop between items so the UI stays responsive
 * - Retries with exponential backoff, idempotency keys, conflict rules
 */
export class SyncEngine {
  private running = false
  private cancelled = false
  private resyncRequested: string | null = null
  private onlineDebounceTimer: NodeJS.Timeout | null = null
  private backgroundTimer: NodeJS.Timeout | null = null
  private unsubscribeConnectivity: (() => void) | null = null

  get isRunning(): boolean {
    return this.running
  }

  /** Start automatic background sync (call once after offline foundation boots). */
  startBackgroundSync(): void {
    if (this.unsubscribeConnectivity) return

    this.unsubscribeConnectivity = connectivityService.onChange((snapshot) => {
      if (snapshot.online) {
        this.scheduleSync('connectivity-restored')
      } else {
        log.info('Connectivity lost — pausing sync scheduling')
        this.clearOnlineDebounce()
      }
    })

    if (!this.backgroundTimer) {
      this.backgroundTimer = setInterval(() => {
        if (!connectivityService.isOnline()) return
        const stats = queueService.getStats()
        if (stats.pending > 0 || stats.failed > 0) {
          log.info('Background sync poll — work remaining', {
            pending: stats.pending,
            failed: stats.failed
          })
          void this.synchronize({ reason: 'background-poll' })
        }
      }, BACKGROUND_POLL_MS)
      this.backgroundTimer.unref?.()
    }

    if (connectivityService.isOnline()) {
      this.scheduleSync('startup-online')
    }

    log.info('Background sync armed')
  }

  stopBackgroundSync(): void {
    this.unsubscribeConnectivity?.()
    this.unsubscribeConnectivity = null
    this.clearOnlineDebounce()
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer)
      this.backgroundTimer = null
    }
    this.cancelled = true
    log.info('Background sync disarmed')
  }

  /** Debounced trigger used when the network returns. */
  scheduleSync(reason: string): void {
    this.clearOnlineDebounce()
    log.info('Scheduling sync', { reason, delayMs: ONLINE_DEBOUNCE_MS })
    this.onlineDebounceTimer = setTimeout(() => {
      this.onlineDebounceTimer = null
      void this.synchronize({ reason })
    }, ONLINE_DEBOUNCE_MS)
    this.onlineDebounceTimer.unref?.()
  }

  cancel(): void {
    if (!this.running) return
    this.cancelled = true
    log.warn('Sync cancellation requested')
  }

  /**
   * Synchronize queued requests. Safe to call repeatedly — concurrent runs are skipped.
   * Never blocks the renderer; all work stays in the main process.
   */
  async synchronize(options: SyncEngineOptions = {}): Promise<SyncRunResult> {
    if (this.running) {
      this.resyncRequested = options.reason ?? 'concurrent'
      log.warn('Sync already running — queued follow-up pass', {
        reason: this.resyncRequested
      })
      return this.emptyResult(true)
    }

    if (!connectivityService.isOnline()) {
      const snapshot = await connectivityService.check()
      if (!snapshot.online) {
        log.info('Sync aborted — offline', { reason: options.reason })
        return this.emptyResult(false)
      }
    }

    const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE)
    const startedAt = Date.now()
    this.running = true
    this.cancelled = false
    this.resyncRequested = null

    const ready = queueService.listReadyForSync(batchSize)
    const total = ready.length

    log.info('Sync started', {
      reason: options.reason ?? 'manual',
      total,
      batchSize
    })

    this.emitProgress({
      phase: 'started',
      total,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      conflicts: 0,
      message: total === 0 ? 'Queue is empty' : `Syncing ${total} request(s)`,
      percent: 0,
      running: true
    })

    let succeeded = 0
    let failed = 0
    let skipped = 0
    let conflicts = 0
    let processed = 0
    const seenFingerprints = new Set<string>()

    try {
      for (const item of ready) {
        if (this.cancelled) {
          log.warn('Sync cancelled mid-batch', { processed, total })
          break
        }

        if (!connectivityService.isOnline()) {
          log.warn('Lost connectivity mid-sync — stopping batch')
          break
        }

        // In-batch duplicate detection (same fingerprint already handled).
        if (item.fingerprint && seenFingerprints.has(item.fingerprint)) {
          log.info('Skipping in-batch duplicate', {
            id: item.id,
            fingerprint: item.fingerprint
          })
          queueService.markCompleted(item.id)
          skipped += 1
          processed += 1
          this.emitItemProgress({
            total,
            processed,
            succeeded,
            failed,
            skipped,
            conflicts,
            item,
            message: 'Skipped duplicate in batch'
          })
          await yieldToEventLoop()
          continue
        }

        if (item.fingerprint) {
          seenFingerprints.add(item.fingerprint)
        }

        if (item.retryCount >= MAX_SYNC_RETRIES) {
          log.error('Max retries exhausted — abandoning queue item', {
            id: item.id,
            retryCount: item.retryCount
          })
          queueService.abandon(
            item.id,
            `Max retries exhausted (${item.retryCount})`
          )
          failed += 1
          processed += 1
          this.emitItemProgress({
            total,
            processed,
            succeeded,
            failed,
            skipped,
            conflicts,
            item,
            message: 'Max retries exhausted'
          })
          await yieldToEventLoop()
          continue
        }

        const outcome = await this.processItemSequentially(item)
        processed += 1

        if (outcome === 'success' || outcome === 'already_applied') {
          succeeded += 1
          if (outcome === 'already_applied') conflicts += 1
        } else if (outcome === 'skipped') {
          skipped += 1
        } else {
          failed += 1
        }

        this.emitItemProgress({
          total,
          processed,
          succeeded,
          failed,
          skipped,
          conflicts,
          item,
          message: `Item ${outcome.replace('_', ' ')}`
        })

        // Sequential processing — yield so IPC/UI stay responsive.
        await yieldToEventLoop()
      }

      const remaining = queueService.getStats().pending + queueService.getStats().failed
      const durationMs = Date.now() - startedAt
      const result: SyncRunResult = {
        total,
        succeeded,
        failed,
        skipped,
        conflicts,
        remaining,
        cancelled: this.cancelled,
        durationMs
      }

      this.emitProgress({
        phase: this.cancelled ? 'cancelled' : 'completed',
        total,
        processed,
        succeeded,
        failed,
        skipped,
        conflicts,
        message: this.cancelled
          ? 'Sync cancelled'
          : `Sync finished in ${durationMs}ms`,
        percent: 100,
        running: false
      })

      log.info('Sync finished', result)
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error('Sync engine failure', { error: message })
      this.emitProgress({
        phase: 'error',
        total,
        processed,
        succeeded,
        failed,
        skipped,
        conflicts,
        message,
        percent: total === 0 ? 0 : Math.round((processed / total) * 100),
        running: false
      })
      return {
        total,
        succeeded,
        failed,
        skipped,
        conflicts,
        remaining: queueService.getStats().pending,
        cancelled: this.cancelled,
        durationMs: Date.now() - startedAt
      }
    } finally {
      this.running = false
      this.cancelled = false
      const followUp = this.resyncRequested
      this.resyncRequested = null
      if (followUp) {
        queueMicrotask(() => {
          void this.synchronize({ reason: `follow-up:${followUp}` })
        })
      }
    }
  }

  private async processItemSequentially(
    item: OfflineQueueItem
  ): Promise<'success' | 'failed' | 'skipped' | 'already_applied'> {
    log.info('Processing queue item', {
      id: item.id,
      method: item.method,
      url: item.url,
      retryCount: item.retryCount
    })

    queueService.markProcessing(item.id)

    try {
      const response = await this.executeHttp(item)
      const bodyText = await response.text().catch(() => '')

      if (response.ok) {
        queueService.markCompleted(item.id)
        log.info('Queue item synced successfully', {
          id: item.id,
          status: response.status
        })
        return 'success'
      }

      const decision = resolveConflict(item, response.status, bodyText)

      if (decision.resolveAsSuccess) {
        queueService.markCompleted(item.id)
        log.info('Queue item resolved via conflict strategy', {
          id: item.id,
          strategy: decision.strategy,
          status: response.status
        })
        return 'already_applied'
      }

      if (decision.shouldRetry && item.retryCount + 1 < MAX_SYNC_RETRIES) {
        const nextRetryAt = this.computeNextRetryAt(item.retryCount + 1)
        queueService.markFailed(item.id, decision.message, nextRetryAt)
        log.warn('Queue item scheduled for retry', {
          id: item.id,
          strategy: decision.strategy,
          nextRetryAt,
          status: response.status
        })
        return 'failed'
      }

      queueService.markFailed(item.id, decision.message, null)
      log.error('Queue item permanently failed', {
        id: item.id,
        strategy: decision.strategy,
        status: response.status,
        message: decision.message
      })
      return 'failed'
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const nextRetryAt =
        item.retryCount + 1 < MAX_SYNC_RETRIES
          ? this.computeNextRetryAt(item.retryCount + 1)
          : null

      queueService.markFailed(item.id, message, nextRetryAt)
      log.error('Queue item transport failure', {
        id: item.id,
        error: message,
        nextRetryAt
      })
      return 'failed'
    }
  }

  private async executeHttp(item: OfflineQueueItem): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const headers: Record<string, string> = { ...item.headers }
      // Prefer canonical Idempotency-Key for safe retries.
      if (!headers['Idempotency-Key'] && headers['idempotency-key']) {
        headers['Idempotency-Key'] = headers['idempotency-key']
      }

      // Refresh bearer so queued mutations survive access-token expiry while offline.
      try {
        const { authSessionService } = await import('@main/services/auth')
        const token = await authSessionService.ensureFreshAccessToken()
        if (token) {
          headers.Authorization = `Bearer ${token}`
        }
      } catch {
        // Keep original queued Authorization if session refresh is unavailable.
      }

      // client_wins retry marker for conflicted upserts
      if (
        (item.method === 'PUT' || item.method === 'PATCH') &&
        item.retryCount > 0
      ) {
        headers['X-EDA-Conflict-Strategy'] = 'client_wins'
      }

      const init: RequestInit = {
        method: item.method,
        headers,
        signal: controller.signal
      }

      if (item.body !== null && item.body !== undefined) {
        init.body =
          typeof item.body === 'string' ? item.body : JSON.stringify(item.body)
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json'
        }
      }

      log.debug('Dispatching queued HTTP request', {
        id: item.id,
        method: item.method,
        url: item.url
      })

      return await fetch(item.url, init)
    } finally {
      clearTimeout(timer)
    }
  }

  private computeNextRetryAt(retryCount: number): string {
    const exp = Math.min(
      MAX_BACKOFF_MS,
      BASE_BACKOFF_MS * 2 ** Math.max(0, retryCount - 1)
    )
    // Full jitter to avoid thundering herd.
    const delay = Math.floor(Math.random() * (exp + 1))
    return new Date(Date.now() + delay).toISOString()
  }

  private emitItemProgress(input: {
    total: number
    processed: number
    succeeded: number
    failed: number
    skipped: number
    conflicts: number
    item: OfflineQueueItem
    message: string
  }): void {
    this.emitProgress({
      phase: 'item',
      total: input.total,
      processed: input.processed,
      succeeded: input.succeeded,
      failed: input.failed,
      skipped: input.skipped,
      conflicts: input.conflicts,
      currentRequestId: input.item.id,
      currentMethod: input.item.method,
      currentUrl: input.item.url,
      message: input.message,
      percent:
        input.total === 0
          ? 100
          : Math.round((input.processed / input.total) * 100),
      running: true
    })
  }

  private emitProgress(event: SyncProgressEvent): void {
    syncProgressReporter.emit(event)
  }

  private clearOnlineDebounce(): void {
    if (this.onlineDebounceTimer) {
      clearTimeout(this.onlineDebounceTimer)
      this.onlineDebounceTimer = null
    }
  }

  private emptyResult(cancelled: boolean): SyncRunResult {
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      conflicts: 0,
      remaining: queueService.getStats().pending,
      cancelled,
      durationMs: 0
    }
  }
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, YIELD_MS))
}

export const syncEngine = new SyncEngine()

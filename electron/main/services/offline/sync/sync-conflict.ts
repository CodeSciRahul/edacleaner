import { createLogger } from '@main/utils/logger'
import type {
  OfflineQueueItem,
  OfflineQueueMethod,
  SyncConflictStrategy
} from '@shared/interfaces'

const log = createLogger('SyncConflict')

export interface ConflictDecision {
  strategy: SyncConflictStrategy
  /** Treat the queue item as successfully applied. */
  resolveAsSuccess: boolean
  /** Schedule another retry with backoff. */
  shouldRetry: boolean
  message: string
}

/**
 * Conflict resolution for offline sync replay.
 *
 * Strategies:
 * - DELETE + 404 → already applied (server-wins / noop success)
 * - POST + 409 → duplicate already created (already_applied)
 * - PUT/PATCH + 409/412 → client_wins once, then fail
 * - 401/403 → fail permanently (no retry)
 * - 408/429/5xx → retry with backoff
 */
export function resolveConflict(
  item: OfflineQueueItem,
  status: number,
  bodyText: string
): ConflictDecision {
  const method = item.method
  const snippet = bodyText.slice(0, 200)

  if (status === 404 && method === 'DELETE') {
    log.info('Conflict resolved — DELETE target already gone', {
      id: item.id,
      url: item.url
    })
    return {
      strategy: 'already_applied',
      resolveAsSuccess: true,
      shouldRetry: false,
      message: 'Resource already deleted on server'
    }
  }

  if (status === 409 && method === 'POST') {
    log.info('Conflict resolved — POST duplicate acknowledged', {
      id: item.id,
      url: item.url
    })
    return {
      strategy: 'already_applied',
      resolveAsSuccess: true,
      shouldRetry: false,
      message: 'Resource already exists on server'
    }
  }

  if ((status === 409 || status === 412) && isUpsertMethod(method)) {
    if (item.retryCount < 1) {
      log.warn('Conflict — retrying upsert once (client_wins)', {
        id: item.id,
        status,
        url: item.url
      })
      return {
        strategy: 'client_wins',
        resolveAsSuccess: false,
        shouldRetry: true,
        message: `Conflict ${status}: retrying client version once`
      }
    }

    log.warn('Conflict — giving up after client_wins attempt', {
      id: item.id,
      status,
      url: item.url,
      snippet
    })
    return {
      strategy: 'server_wins',
      resolveAsSuccess: false,
      shouldRetry: false,
      message: `Conflict ${status}: server version retained`
    }
  }

  if (status === 401 || status === 403) {
    return {
      strategy: 'fail',
      resolveAsSuccess: false,
      shouldRetry: false,
      message: `Authorization failed (${status})`
    }
  }

  if (status === 408 || status === 429 || status >= 500) {
    return {
      strategy: 'retry',
      resolveAsSuccess: false,
      shouldRetry: true,
      message: `Transient HTTP ${status}`
    }
  }

  if (status >= 400) {
    return {
      strategy: 'fail',
      resolveAsSuccess: false,
      shouldRetry: false,
      message: `HTTP ${status}: ${snippet || 'request rejected'}`
    }
  }

  return {
    strategy: 'already_applied',
    resolveAsSuccess: true,
    shouldRetry: false,
    message: 'OK'
  }
}

function isUpsertMethod(method: OfflineQueueMethod): boolean {
  return method === 'PUT' || method === 'PATCH'
}

import { cacheRepository } from './repositories/cache-repository'
import { createLogger } from '@main/utils/logger'

const log = createLogger('CacheManager')

const DEFAULT_NAMESPACE = 'default'
const DEFAULT_TTL_MS = 5 * 60 * 1000
const PURGE_INTERVAL_MS = 60_000

export interface CacheSetOptions {
  /** Time-to-live in milliseconds. Omit or 0 for no expiry. */
  ttlMs?: number
  namespace?: string
}

/**
 * TTL cache manager backed by the local database.
 */
export class CacheManager {
  private lastPurgeAt = 0

  get<T>(key: string, namespace = DEFAULT_NAMESPACE): T | null {
    this.assertKey(key)
    this.maybePurgeExpired()

    const row = cacheRepository.get(namespace, key)
    if (!row) return null

    if (row.expires_at != null && Number(row.expires_at) <= Date.now()) {
      cacheRepository.delete(namespace, key)
      return null
    }

    try {
      return JSON.parse(row.value) as T
    } catch {
      log.warn('Corrupt cache entry — removing', { namespace, key })
      cacheRepository.delete(namespace, key)
      return null
    }
  }

  set(key: string, value: unknown, options: CacheSetOptions = {}): void {
    this.assertKey(key)
    const namespace = options.namespace ?? DEFAULT_NAMESPACE
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    const expiresAt = ttlMs && ttlMs > 0 ? Date.now() + ttlMs : null

    cacheRepository.set(namespace, key, JSON.stringify(value), expiresAt)
    this.maybePurgeExpired()
  }

  has(key: string, namespace = DEFAULT_NAMESPACE): boolean {
    return this.get(key, namespace) !== null
  }

  delete(key: string, namespace = DEFAULT_NAMESPACE): boolean {
    this.assertKey(key)
    return cacheRepository.delete(namespace, key)
  }

  clear(namespace?: string): number {
    return cacheRepository.clear(namespace)
  }

  purgeExpired(): number {
    this.lastPurgeAt = Date.now()
    const deleted = cacheRepository.purgeExpired()
    if (deleted > 0) {
      log.info('Purged expired cache entries', { deleted })
    }
    return deleted
  }

  private maybePurgeExpired(): void {
    if (Date.now() - this.lastPurgeAt < PURGE_INTERVAL_MS) return
    this.purgeExpired()
  }

  private assertKey(key: string): void {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('Cache key must be a non-empty string')
    }
  }
}

export const cacheManager = new CacheManager()

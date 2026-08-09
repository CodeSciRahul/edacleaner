import { BaseRepository } from './base-repository'

export interface CacheRecord {
  namespace: string
  key: string
  value: string
  expires_at: number | null
  updated_at: string
}

/**
 * TTL-aware cache repository backed by cache_store.
 */
export class CacheRepository extends BaseRepository {
  get(namespace: string, key: string): CacheRecord | null {
    return this.queryOne<CacheRecord>(
      `SELECT namespace, key, value, expires_at, updated_at
       FROM cache_store
       WHERE namespace = ? AND key = ?
       LIMIT 1;`,
      [namespace, key]
    )
  }

  set(
    namespace: string,
    key: string,
    value: string,
    expiresAt: number | null
  ): void {
    this.run(
      `INSERT INTO cache_store (namespace, key, value, expires_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(namespace, key) DO UPDATE SET
         value = excluded.value,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at;`,
      [namespace, key, value, expiresAt, this.nowIso()]
    )
  }

  delete(namespace: string, key: string): boolean {
    const existing = this.get(namespace, key)
    if (!existing) return false
    this.run('DELETE FROM cache_store WHERE namespace = ? AND key = ?;', [
      namespace,
      key
    ])
    return true
  }

  clear(namespace?: string): number {
    if (namespace) {
      const rows = this.queryAll<{ c: number }>(
        'SELECT COUNT(*) as c FROM cache_store WHERE namespace = ?;',
        [namespace]
      )
      const count = Number(rows[0]?.c ?? 0)
      this.run('DELETE FROM cache_store WHERE namespace = ?;', [namespace])
      return count
    }

    const rows = this.queryAll<{ c: number }>(
      'SELECT COUNT(*) as c FROM cache_store;'
    )
    const count = Number(rows[0]?.c ?? 0)
    this.run('DELETE FROM cache_store;')
    return count
  }

  /** Remove expired entries. Returns number of deleted rows. */
  purgeExpired(nowMs = Date.now()): number {
    const rows = this.queryAll<{ c: number }>(
      'SELECT COUNT(*) as c FROM cache_store WHERE expires_at IS NOT NULL AND expires_at <= ?;',
      [nowMs]
    )
    const count = Number(rows[0]?.c ?? 0)
    if (count > 0) {
      this.run(
        'DELETE FROM cache_store WHERE expires_at IS NOT NULL AND expires_at <= ?;',
        [nowMs]
      )
    }
    return count
  }
}

export const cacheRepository = new CacheRepository()

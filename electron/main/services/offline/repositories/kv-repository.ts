import { BaseRepository } from './base-repository'

export interface KvRecord {
  namespace: string
  key: string
  value: string
  updated_at: string
}

/**
 * Generic namespaced key-value repository backed by kv_store.
 */
export class KvRepository extends BaseRepository {
  get(namespace: string, key: string): string | null {
    const row = this.queryOne<KvRecord>(
      'SELECT namespace, key, value, updated_at FROM kv_store WHERE namespace = ? AND key = ? LIMIT 1;',
      [namespace, key]
    )
    return row?.value ?? null
  }

  set(namespace: string, key: string, value: string): void {
    this.run(
      `INSERT INTO kv_store (namespace, key, value, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(namespace, key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at;`,
      [namespace, key, value, this.nowIso()]
    )
  }

  delete(namespace: string, key: string): boolean {
    const existing = this.get(namespace, key)
    if (existing === null) return false
    this.run('DELETE FROM kv_store WHERE namespace = ? AND key = ?;', [namespace, key])
    return true
  }

  keys(namespace: string): string[] {
    const rows = this.queryAll<{ key: string }>(
      'SELECT key FROM kv_store WHERE namespace = ? ORDER BY key ASC;',
      [namespace]
    )
    return rows.map((row) => row.key)
  }

  getAll(namespace: string): Record<string, string> {
    const rows = this.queryAll<KvRecord>(
      'SELECT namespace, key, value, updated_at FROM kv_store WHERE namespace = ?;',
      [namespace]
    )
    const out: Record<string, string> = {}
    for (const row of rows) {
      out[row.key] = row.value
    }
    return out
  }

  clear(namespace: string): number {
    const before = this.keys(namespace).length
    this.run('DELETE FROM kv_store WHERE namespace = ?;', [namespace])
    return before
  }
}

export const kvRepository = new KvRepository()

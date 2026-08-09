import { BaseRepository } from './base-repository'

export interface SecureRecord {
  key: string
  ciphertext: string
  encoding: string
  updated_at: string
}

/**
 * Stores encrypted blobs only — encryption/decryption is handled by SecureStorageService.
 */
export class SecureRepository extends BaseRepository {
  get(key: string): SecureRecord | null {
    return this.queryOne<SecureRecord>(
      'SELECT key, ciphertext, encoding, updated_at FROM secure_store WHERE key = ? LIMIT 1;',
      [key]
    )
  }

  set(key: string, ciphertext: string, encoding: string): void {
    this.run(
      `INSERT INTO secure_store (key, ciphertext, encoding, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         ciphertext = excluded.ciphertext,
         encoding = excluded.encoding,
         updated_at = excluded.updated_at;`,
      [key, ciphertext, encoding, this.nowIso()]
    )
  }

  delete(key: string): boolean {
    const existing = this.get(key)
    if (!existing) return false
    this.run('DELETE FROM secure_store WHERE key = ?;', [key])
    return true
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  keys(): string[] {
    const rows = this.queryAll<{ key: string }>(
      'SELECT key FROM secure_store ORDER BY key ASC;'
    )
    return rows.map((row) => row.key)
  }
}

export const secureRepository = new SecureRepository()

import type { LocalDatabase } from '../database/database'
import { databaseManager } from '../database/database'

/**
 * Thin base for local repositories. Always go through DatabaseManager
 * so writes can be persisted consistently.
 */
export abstract class BaseRepository {
  protected get db(): LocalDatabase {
    return databaseManager.getDb()
  }

  protected markDirty(): void {
    databaseManager.markDirty()
  }

  protected nowIso(): string {
    return new Date().toISOString()
  }

  /**
   * Execute a SELECT and map rows to objects keyed by column name.
   */
  protected queryAll<T extends object>(
    sql: string,
    params: Array<string | number | null> = []
  ): T[] {
    const stmt = this.db.prepare(sql)
    try {
      stmt.bind(params)

      const rows: T[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T)
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  protected queryOne<T extends object>(
    sql: string,
    params: Array<string | number | null> = []
  ): T | null {
    const rows = this.queryAll<T>(sql, params)
    return rows[0] ?? null
  }

  protected run(sql: string, params: Array<string | number | null> = []): void {
    this.db.run(sql, params)
    this.markDirty()
  }
}

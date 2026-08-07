import type { LocalDatabase } from './database'
import { createLogger } from '@main/utils/logger'

const log = createLogger('Migrations')

/**
 * Sequential schema migrations for the local SQLite database.
 * Each migration runs once and is recorded in schema_migrations.
 */
const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS kv_store (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (namespace, key)
      );

      CREATE INDEX IF NOT EXISTS idx_kv_store_namespace
        ON kv_store (namespace);

      CREATE TABLE IF NOT EXISTS cache_store (
        namespace TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at INTEGER,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (namespace, key)
      );

      CREATE INDEX IF NOT EXISTS idx_cache_store_expires
        ON cache_store (expires_at);

      CREATE TABLE IF NOT EXISTS secure_store (
        key TEXT PRIMARY KEY NOT NULL,
        ciphertext TEXT NOT NULL,
        encoding TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  },
  {
    version: 2,
    sql: `
      CREATE TABLE IF NOT EXISTS request_queue (
        id TEXT PRIMARY KEY NOT NULL,
        url TEXT NOT NULL,
        method TEXT NOT NULL,
        headers TEXT NOT NULL,
        body TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_request_queue_status
        ON request_queue (status);

      CREATE INDEX IF NOT EXISTS idx_request_queue_created
        ON request_queue (created_at);
    `
  },
  {
    version: 3,
    sql: `
      ALTER TABLE request_queue ADD COLUMN fingerprint TEXT;
      ALTER TABLE request_queue ADD COLUMN next_retry_at TEXT;

      CREATE INDEX IF NOT EXISTS idx_request_queue_fingerprint
        ON request_queue (fingerprint);

      CREATE INDEX IF NOT EXISTS idx_request_queue_next_retry
        ON request_queue (next_retry_at);
    `
  }
]

function tableHasColumn(db: LocalDatabase, table: string, column: string): boolean {
  try {
    const result = db.exec(`PRAGMA table_info(${table});`)
    const rows = result[0]?.values ?? []
    return rows.some((row) => String(row[1]) === column)
  } catch {
    return false
  }
}

export function runMigrations(db: LocalDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const applied = new Set<number>()
  const result = db.exec('SELECT version FROM schema_migrations')
  if (result[0]) {
    for (const row of result[0].values) {
      applied.add(Number(row[0]))
    }
  }

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue

    // v3 ALTER is not fully idempotent if half-applied — guard columns.
    if (migration.version === 3) {
      if (!tableHasColumn(db, 'request_queue', 'fingerprint')) {
        db.run('ALTER TABLE request_queue ADD COLUMN fingerprint TEXT;')
      }
      if (!tableHasColumn(db, 'request_queue', 'next_retry_at')) {
        db.run('ALTER TABLE request_queue ADD COLUMN next_retry_at TEXT;')
      }
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_request_queue_fingerprint ON request_queue (fingerprint);'
      )
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_request_queue_next_retry ON request_queue (next_retry_at);'
      )
      db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);', [
        migration.version,
        new Date().toISOString()
      ])
      log.info('Applied migration', { version: migration.version })
      continue
    }

    db.run('BEGIN;')
    try {
      db.exec(migration.sql)
      db.run('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);', [
        migration.version,
        new Date().toISOString()
      ])
      db.run('COMMIT;')
      log.info('Applied migration', { version: migration.version })
    } catch (error) {
      db.run('ROLLBACK;')
      log.error('Migration failed', { version: migration.version, error })
      throw error
    }
  }
}

import type { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js'
import { app } from 'electron'
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  access,
  copyFile,
  unlink,
  readdir
} from 'fs/promises'
import { constants } from 'fs'
import { dirname, join, basename } from 'path'
import { createRequire } from 'module'
import { createLogger } from '@main/utils/logger'
import { runMigrations } from './migrations'

const log = createLogger('Database')
const require = createRequire(import.meta.url)

const DB_FILE_NAME = 'eda-cleaner.db'
const BACKUP_FILE_NAME = 'eda-cleaner.db.bak'
const PERSIST_DEBOUNCE_MS = 250
const MAX_DB_WARN_BYTES = 64 * 1024 * 1024

export type LocalDatabase = SqlJsDatabase

export class DatabaseManager {
  private SQL: SqlJsStatic | null = null
  private db: LocalDatabase | null = null
  private dbPath = ''
  private backupPath = ''
  private dataDir = ''
  private persistTimer: NodeJS.Timeout | null = null
  private dirty = false
  private initialized = false
  private persisting: Promise<void> | null = null

  get isReady(): boolean {
    return this.initialized && this.db !== null
  }

  get path(): string {
    return this.dbPath
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    const userData = app.getPath('userData')
    this.dataDir = join(userData, 'data')
    await mkdir(this.dataDir, { recursive: true })
    this.dbPath = join(this.dataDir, DB_FILE_NAME)
    this.backupPath = join(this.dataDir, BACKUP_FILE_NAME)

    await this.cleanupOrphanTempFiles()

    // sql.js ships WASM — load via CJS require so Electron packaging resolves it.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const initSqlJs = require('sql.js') as (config?: {
      locateFile?: (file: string) => string
    }) => Promise<SqlJsStatic>

    this.SQL = await initSqlJs({
      locateFile: (file: string) => {
        return require.resolve(`sql.js/dist/${file}`)
      }
    })

    this.db = await this.openWithRecovery()
    this.db.run('PRAGMA foreign_keys = ON;')
    runMigrations(this.db)
    await this.persistNow({ createBackup: true })

    this.initialized = true
    log.info('Local database ready', { path: this.dbPath })
  }

  getDb(): LocalDatabase {
    if (!this.db) {
      throw new Error('Local database is not initialized')
    }
    return this.db
  }

  /** Mark DB dirty and schedule a debounced flush to disk. */
  markDirty(): void {
    this.dirty = true
    if (this.persistTimer) return
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null
      void this.persistNow().catch((error) => {
        log.error('Failed to persist database', error)
      })
    }, PERSIST_DEBOUNCE_MS)
    this.persistTimer.unref?.()
  }

  async persistNow(options: { createBackup?: boolean } = {}): Promise<void> {
    if (this.persisting) {
      await this.persisting
      if (!this.dirty && !options.createBackup) return
    }

    this.persisting = this.doPersist(options).finally(() => {
      this.persisting = null
    })
    await this.persisting
  }

  async close(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer)
      this.persistTimer = null
    }

    if (this.dirty || this.db) {
      try {
        await this.persistNow({ createBackup: true })
      } catch (error) {
        log.error('Final database persist failed during close', error)
      }
    }

    this.db?.close()
    this.db = null
    this.initialized = false
    log.info('Local database closed')
  }

  health(): { ready: boolean; path: string; dirty: boolean } {
    return {
      ready: this.isReady,
      path: this.dbPath,
      dirty: this.dirty
    }
  }

  /** Run integrity_check; returns true when OK. */
  checkIntegrity(): boolean {
    if (!this.db) return false
    try {
      const result = this.db.exec('PRAGMA integrity_check;')
      const value = result[0]?.values?.[0]?.[0]
      const ok = value === 'ok'
      if (!ok) {
        log.error('Database integrity check failed', { result: value })
      }
      return ok
    } catch (error) {
      log.error('Database integrity check threw', error)
      return false
    }
  }

  private async doPersist(options: { createBackup?: boolean }): Promise<void> {
    if (!this.db || !this.dbPath) return

    const data = this.db.export()
    const buffer = Buffer.from(data)
    if (buffer.byteLength >= MAX_DB_WARN_BYTES) {
      log.warn('Local database is large — consider cleanup', {
        bytes: buffer.byteLength
      })
    }

    const tempPath = `${this.dbPath}.tmp`
    await writeFile(tempPath, buffer)
    await rename(tempPath, this.dbPath)
    this.dirty = false

    if (options.createBackup) {
      try {
        await copyFile(this.dbPath, this.backupPath)
      } catch (error) {
        log.warn('Database backup failed', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    log.debug('Database persisted', { bytes: buffer.byteLength })
  }

  private async openWithRecovery(): Promise<LocalDatabase> {
    const primary = await this.tryOpenFile(this.dbPath)
    if (primary) {
      if (!this.isIntegrityOk(primary)) {
        log.error('Primary DB failed integrity check — quarantining')
        primary.close()
        await this.quarantineFile(this.dbPath, 'corrupt')
      } else {
        return primary
      }
    }

    const backup = await this.tryOpenFile(this.backupPath)
    if (backup) {
      if (!this.isIntegrityOk(backup)) {
        log.error('Backup DB failed integrity check — discarding')
        backup.close()
        await this.quarantineFile(this.backupPath, 'corrupt-bak')
      } else {
        log.warn('Restored local database from backup')
        // Persist restored DB to primary path.
        this.db = backup
        await this.doPersist({ createBackup: true })
        return backup
      }
    }

    log.warn('Starting with empty local database')
    return new this.SQL!.Database()
  }

  private isIntegrityOk(db: LocalDatabase): boolean {
    try {
      const result = db.exec('PRAGMA integrity_check;')
      return result[0]?.values?.[0]?.[0] === 'ok'
    } catch {
      return false
    }
  }

  private async tryOpenFile(path: string): Promise<LocalDatabase | null> {
    try {
      await access(path, constants.F_OK)
      const buf = await readFile(path)
      if (!buf.byteLength) return null
      return new this.SQL!.Database(new Uint8Array(buf))
    } catch {
      return null
    }
  }

  private async quarantineFile(path: string, reason: string): Promise<void> {
    try {
      const dest = `${path}.${reason}.${Date.now()}`
      await rename(path, dest)
      log.warn('Quarantined database file', { from: path, to: dest })
    } catch (error) {
      log.error('Failed to quarantine database file', error)
      try {
        await unlink(path)
      } catch {
        // ignore
      }
    }
  }

  private async cleanupOrphanTempFiles(): Promise<void> {
    try {
      const entries = await readdir(this.dataDir)
      for (const name of entries) {
        if (!name.endsWith('.tmp')) continue
        if (!name.startsWith(basename(DB_FILE_NAME))) continue
        const full = join(this.dataDir, name)
        await unlink(full).catch(() => undefined)
        log.info('Removed orphan temp database file', { file: name })
      }
    } catch {
      // Directory may be empty on first run.
    }
  }
}

export const databaseManager = new DatabaseManager()

/** Ensure parent directory exists (used by secure key fallback file). */
export async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
}

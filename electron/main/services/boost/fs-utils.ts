import { readdir, rm, stat } from 'fs/promises'
import { join } from 'path'
import { createLogger } from '@main/utils/logger'

const log = createLogger('boost:fs')

export interface CleanDirectoryResult {
  bytesRemoved: number
  filesRemoved: number
  errors: string[]
}

function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

/**
 * Recursively removes contents of a directory (not the directory itself).
 * Yields periodically so the Electron main process stays responsive.
 */
export async function cleanDirectoryContents(
  dirPath: string,
  signal?: AbortSignal,
  maxEntries = 8_000
): Promise<CleanDirectoryResult> {
  const result: CleanDirectoryResult = {
    bytesRemoved: 0,
    filesRemoved: 0,
    errors: []
  }

  let entriesProcessed = 0

  async function walk(current: string): Promise<void> {
    if (signal?.aborted) return
    if (entriesProcessed >= maxEntries) return

    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch (err) {
      result.errors.push(
        `${current}: ${err instanceof Error ? err.message : 'unreadable'}`
      )
      return
    }

    for (const entry of entries) {
      if (signal?.aborted || entriesProcessed >= maxEntries) return
      entriesProcessed += 1

      const fullPath = join(current, entry.name)

      try {
        if (entry.isDirectory() && !entry.isSymbolicLink()) {
          await walk(fullPath)
          try {
            await rm(fullPath, { recursive: true, force: true })
          } catch (err) {
            // Directory may still hold locked files — record and continue
            result.errors.push(
              `${fullPath}: ${err instanceof Error ? err.message : 'locked'}`
            )
          }
        } else {
          let size = 0
          try {
            const info = await stat(fullPath)
            size = info.size
          } catch {
            // size unknown; still try delete
          }
          await rm(fullPath, { force: true })
          result.bytesRemoved += size
          result.filesRemoved += 1
        }
      } catch (err) {
        result.errors.push(
          `${fullPath}: ${err instanceof Error ? err.message : 'failed'}`
        )
      }

      if (entriesProcessed % 50 === 0) {
        await yieldEventLoop()
      }
    }
  }

  try {
    await walk(dirPath)
  } catch (err) {
    log.warn('cleanDirectoryContents failed', dirPath, err)
    result.errors.push(err instanceof Error ? err.message : 'Unknown clean error')
  }

  return result
}

export async function estimateDirectorySize(
  dirPath: string,
  signal?: AbortSignal,
  maxEntries = 4_000
): Promise<number> {
  let total = 0
  let count = 0

  async function walk(current: string): Promise<void> {
    if (signal?.aborted || count >= maxEntries) return

    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (signal?.aborted || count >= maxEntries) return
      count += 1
      const fullPath = join(current, entry.name)

      try {
        if (entry.isDirectory() && !entry.isSymbolicLink()) {
          await walk(fullPath)
        } else {
          const info = await stat(fullPath)
          total += info.size
        }
      } catch {
        // skip
      }

      if (count % 100 === 0) {
        await yieldEventLoop()
      }
    }
  }

  await walk(dirPath)
  return total
}

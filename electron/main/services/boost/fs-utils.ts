import { readdir, rm, stat } from 'fs/promises'
import { join } from 'path'
import { createLogger } from '@main/utils/logger'
import { getSafetyEngine } from '@main/services/safety'

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
 * Every target is gated by the Safety Engine (permanent-delete mode).
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

  const safety = getSafetyEngine()
  const rootDecision = await safety.assertDeletable(dirPath, { permanent: true })
  if (!rootDecision.deletionAllowed) {
    log.info('cleanDirectoryContents blocked', {
      path: dirPath,
      matchedRule: rootDecision.ruleId,
      risk: rootDecision.riskLevel,
      reason: rootDecision.reason
    })
    result.errors.push(`Protected: ${rootDecision.reason}`)
    return result
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
        // Re-check before each delete — blocks symlink escapes into protected trees
        const decision = await safety.assertDeletable(fullPath, { permanent: true })
        if (!decision.deletionAllowed) {
          result.errors.push(`Protected: ${fullPath}`)
          continue
        }

        if (entry.isDirectory() && !entry.isSymbolicLink()) {
          await walk(fullPath)
          try {
            // Non-recursive: leave the folder if protected children were skipped
            await rm(fullPath, { recursive: false, force: true })
          } catch {
            // Directory not empty (protected / locked children remain) — expected
          }
        } else {
          let size = 0
          try {
            const info = await stat(fullPath)
            size = info.size
          } catch {
            // size unknown; still try delete
          }
          await rm(decision.realPath || fullPath, { force: true })
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

export interface DirectoryEstimate {
  bytes: number
  files: number
  truncated: boolean
}

export async function estimateDirectorySize(
  dirPath: string,
  signal?: AbortSignal,
  maxEntries = 4_000
): Promise<number> {
  const estimate = await estimateDirectoryStats(dirPath, signal, maxEntries)
  return estimate.bytes
}

/**
 * Estimates reclaimable size and file count under a directory.
 * Caps walk depth via maxEntries and yields so the main process stays responsive.
 */
export async function estimateDirectoryStats(
  dirPath: string,
  signal?: AbortSignal,
  maxEntries = 4_000
): Promise<DirectoryEstimate> {
  let bytes = 0
  let files = 0
  let count = 0
  let truncated = false

  async function walk(current: string): Promise<void> {
    if (signal?.aborted) return
    if (count >= maxEntries) {
      truncated = true
      return
    }

    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (signal?.aborted) return
      if (count >= maxEntries) {
        truncated = true
        return
      }
      count += 1
      const fullPath = join(current, entry.name)

      try {
        if (entry.isDirectory() && !entry.isSymbolicLink()) {
          await walk(fullPath)
        } else {
          const info = await stat(fullPath)
          bytes += info.size
          files += 1
        }
      } catch {
        // skip locked / missing entries
      }

      if (count % 100 === 0) {
        await yieldEventLoop()
      }
    }
  }

  await walk(dirPath)
  return { bytes, files, truncated }
}

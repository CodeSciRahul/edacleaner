import {
  cleanDirectoryContents,
  estimateDirectoryStats
} from '@main/services/boost/fs-utils'
import type {
  CleanupModule,
  CleanupModuleCleanResult,
  CleanupModuleContext,
  CleanupModuleScanResult,
  CleanupProgressEmitter,
  CleanupTarget
} from './types'
import { isBenignFsError, isBroadCacheRoot } from '../path-resolvers'

async function estimateTargets(
  targets: CleanupTarget[],
  signal?: AbortSignal,
  maxEntries = 2_500
): Promise<{ bytes: number; files: number; samplePaths: string[] }> {
  let bytes = 0
  let files = 0
  const samplePaths: string[] = []

  for (const target of targets) {
    if (target.kind !== 'directory') continue
    if (samplePaths.length < 4) samplePaths.push(target.path)
    const stats = await estimateDirectoryStats(target.path, signal, maxEntries)
    bytes += stats.bytes
    files += stats.files
  }

  return { bytes, files, samplePaths }
}

async function cleanDirectoryTargets(
  targets: CleanupTarget[],
  signal: AbortSignal | undefined,
  emit: CleanupProgressEmitter,
  categoryId: CleanupModule['id'],
  message: string
): Promise<CleanupModuleCleanResult> {
  let bytesFreed = 0
  let filesRemoved = 0
  const errors: string[] = []

  for (const target of targets) {
    if (signal?.aborted) {
      return {
        bytesFreed,
        filesRemoved,
        cancelled: true,
        detail: 'Cancelled during cleanup'
      }
    }

    if (target.kind !== 'directory') continue
    if (isBroadCacheRoot(target.path)) {
      errors.push(`Skipped broad root: ${target.path}`)
      continue
    }

    emit({
      phase: `cleaning-${categoryId}`,
      categoryId,
      message,
      percent: 0,
      currentItem: target.path,
      bytesFreedSoFar: bytesFreed
    })

    const cleaned = await cleanDirectoryContents(
      target.path,
      signal,
      target.maxEntries ?? 6_000
    )
    bytesFreed += cleaned.bytesRemoved
    filesRemoved += cleaned.filesRemoved
    errors.push(...cleaned.errors.slice(0, 5))
  }

  const benignOnly =
    errors.length > 0 && errors.every((err) => isBenignFsError(err))

  if (filesRemoved > 0) {
    return {
      bytesFreed,
      filesRemoved,
      detail: `Optimized ${filesRemoved.toLocaleString()} item(s)`,
      // Soft note only — UI treats these as reassurance, not failures
      error: benignOnly && errors[0] ? errors[0] : errors.find((e) => !isBenignFsError(e))
    }
  }

  if (benignOnly) {
    return {
      bytesFreed: 0,
      filesRemoved: 0,
      detail: 'Protected in-use items left safely in place',
      error: errors[0]
    }
  }

  return {
    bytesFreed: 0,
    filesRemoved: 0,
    detail: errors[0] ?? 'Already clear — nothing to remove',
    error: errors[0]
  }
}

export function createDirectoryCleanupModule(config: {
  id: CleanupModule['id']
  label: string
  description: string
  risk: CleanupModule['risk']
  resolvePaths: (ctx: CleanupModuleContext) => Promise<string[]>
  maxEstimateEntries?: number
  maxCleanEntries?: number
  cleanMessage: string
}): CleanupModule {
  return {
    id: config.id,
    label: config.label,
    description: config.description,
    risk: config.risk,

    async scan(ctx): Promise<CleanupModuleScanResult> {
      const paths = (await config.resolvePaths(ctx)).filter((p) => !isBroadCacheRoot(p))
      if (paths.length === 0) {
        return {
          estimatedBytes: 0,
          estimatedFiles: 0,
          available: false,
          unavailableReason: 'Nothing to optimize here on this system',
          samplePaths: [],
          targets: []
        }
      }

      const targets = paths.map((path) => ({
        kind: 'directory' as const,
        path,
        maxEntries: config.maxCleanEntries
      }))

      const { bytes, files, samplePaths } = await estimateTargets(
        targets,
        ctx.signal,
        config.maxEstimateEntries ?? 2_500
      )

      return {
        estimatedBytes: bytes,
        estimatedFiles: files,
        available: true,
        samplePaths,
        targets
      }
    },

    async clean(targets, ctx, emit): Promise<CleanupModuleCleanResult> {
      return cleanDirectoryTargets(
        targets,
        ctx.signal,
        emit,
        config.id,
        config.cleanMessage
      )
    }
  }
}

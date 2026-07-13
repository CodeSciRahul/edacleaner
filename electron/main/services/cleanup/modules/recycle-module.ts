import type {
  CleanupModule,
  CleanupModuleCleanResult,
  CleanupModuleScanResult,
  CleanupProgressEmitter,
  CleanupTarget
} from './types'

/**
 * Empties the platform trash / recycle bin via the boost platform adapter.
 * Size is approximate — many OS trash APIs do not expose totals cheaply.
 */
export const recycleModule: CleanupModule = {
  id: 'recycle',
  label: 'Recycle Bin',
  description: 'Permanently remove items waiting in Trash / Recycle Bin',
  risk: 'safe',

  async scan(ctx): Promise<CleanupModuleScanResult> {
    if (!ctx.adapter.supportsEmptyTrash()) {
      return {
        estimatedBytes: 0,
        estimatedFiles: 0,
        available: false,
        unavailableReason: 'Empty trash is not supported on this platform',
        samplePaths: [],
        targets: []
      }
    }

    return {
      // Trash size is expensive / unreliable across platforms — treat as available
      // without a hard byte estimate so the user can still opt in.
      estimatedBytes: 0,
      estimatedFiles: 0,
      available: true,
      samplePaths: [],
      targets: [{ kind: 'trash' }]
    }
  },

  async clean(
    _targets: CleanupTarget[],
    ctx,
    emit: CleanupProgressEmitter
  ): Promise<CleanupModuleCleanResult> {
    if (!ctx.adapter.supportsEmptyTrash()) {
      return {
        bytesFreed: 0,
        filesRemoved: 0,
        detail: 'Empty trash is not supported on this platform'
      }
    }

    if (ctx.signal?.aborted) {
      return {
        bytesFreed: 0,
        filesRemoved: 0,
        cancelled: true,
        detail: 'Cancelled before emptying trash'
      }
    }

    emit({
      phase: 'cleaning-recycle',
      categoryId: 'recycle',
      message: 'Refreshing Recycle Bin / Trash…',
      percent: 0,
      currentItem: 'Trash'
    })

    const result = await ctx.adapter.emptyTrash(ctx.signal)

    if (ctx.signal?.aborted) {
      return {
        bytesFreed: 0,
        filesRemoved: 0,
        cancelled: true,
        detail: result.detail,
        error: result.error
      }
    }

    return {
      bytesFreed: 0,
      filesRemoved: result.emptied ? 1 : 0,
      detail: result.detail,
      error: result.error
    }
  }
}

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { electronService } from '@/services/electron-service'
import { formatBytes } from '@shared/utils'
import { useSettingsStore } from '@/store/settings-store'
import type {
  CleanupCategoryId,
  CleanupExecuteOptions,
  CleanupProgressEvent,
  CleanupResult,
  CleanupScanResult
} from '@shared/interfaces'

export const cleanupKeys = {
  scan: ['cleanup', 'scan'] as const
}

export function useCleanupProgress(active: boolean) {
  const [progress, setProgress] = useState<CleanupProgressEvent | null>(null)

  useEffect(() => {
    if (!active) {
      setProgress(null)
      return
    }

    const unsubscribe = electronService.cleanup().onProgress((event) => {
      setProgress(event)
    })

    return () => {
      unsubscribe()
    }
  }, [active])

  return progress
}

export function useScanCleanup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => electronService.cleanup().scan(),
    onSuccess: (data) => {
      queryClient.setQueryData(cleanupKeys.scan, data)
    }
  })
}

export function useRunCleanup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: CleanupExecuteOptions) => {
      if (options.categories.length === 0) {
        return {
          cancelled: true as const,
          result: null as CleanupResult | null
        }
      }

      const confirmBeforeClean = useSettingsStore.getState().confirmBeforeClean
      if (confirmBeforeClean) {
        const confirmed = await electronService.dialog().message({
          type: 'info',
          title: 'Optimize your PC?',
          message: `Optimize ${options.categories.length} selected categor${
            options.categories.length === 1 ? 'y' : 'ies'
          }?`,
          detail:
            'We’ll safely reclaim junk, temp files, and caches. Personal documents are never touched. A few in-use files may be left alone so your apps stay stable.',
          buttons: ['Not now', 'Optimize now']
        })

        if (confirmed.response !== 1) {
          return { cancelled: true as const, result: null as CleanupResult | null }
        }
      }

      const result = await electronService.cleanup().execute(options)
      return { cancelled: false as const, result }
    },
    onSuccess: (payload) => {
      if (payload.cancelled || !payload.result) return
      void queryClient.invalidateQueries({ queryKey: cleanupKeys.scan })
      void queryClient.invalidateQueries({ queryKey: ['storage'] })
      void queryClient.invalidateQueries({ queryKey: ['boost'] })
    }
  })
}

export function useCancelCleanup() {
  return useMutation({
    mutationFn: () => electronService.cleanup().cancel()
  })
}

export function summarizeSelected(
  scan: CleanupScanResult | undefined,
  selected: Set<CleanupCategoryId>
): { bytes: number; files: number; count: number; label: string } {
  if (!scan) {
    return { bytes: 0, files: 0, count: 0, label: formatBytes(0) }
  }

  let bytes = 0
  let files = 0
  let count = 0

  for (const category of scan.categories) {
    if (!selected.has(category.id) || !category.available) continue
    bytes += category.estimatedBytes
    files += category.estimatedFiles
    count += 1
  }

  return { bytes, files, count, label: formatBytes(bytes) }
}

export type { CleanupResult, CleanupScanResult }

import { useCallback, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { electronService } from '@/services/electron-service'
import type {
  BackgroundProcessesUpdate,
  BoostOptions,
  BoostProcessInfo,
  BoostProgressEvent,
  BoostResult
} from '@shared/interfaces'

export const boostKeys = {
  analysis: ['boost', 'analysis'] as const,
  snapshot: ['boost', 'snapshot'] as const,
  processes: ['boost', 'processes'] as const
}

export function useBoostAnalysis(enabled = true) {
  return useQuery({
    queryKey: boostKeys.analysis,
    queryFn: () => electronService.boost().analyze(),
    enabled,
    staleTime: 30_000
  })
}

export function useBoostSnapshot(enabled = true) {
  return useQuery({
    queryKey: boostKeys.snapshot,
    queryFn: () => electronService.boost().getSnapshot(),
    enabled,
    refetchInterval: enabled ? 10_000 : false
  })
}

/**
 * Live background-process feed while the page is mounted.
 * Seeds with listProcesses(), then receives push updates every ~1.5s.
 */
export function useLiveBackgroundProcesses() {
  const queryClient = useQueryClient()
  const [processes, setProcesses] = useState<BoostProcessInfo[]>([])
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isLive, setIsLive] = useState(false)

  const applyUpdate = useCallback(
    (update: BackgroundProcessesUpdate) => {
      setProcesses(update.processes)
      setUpdatedAt(update.updatedAt)
      setIsLoading(false)
      setIsFetching(false)
      setIsError(false)
      setError(null)
      queryClient.setQueryData(boostKeys.processes, update)
    },
    [queryClient]
  )

  const refresh = useCallback(async () => {
    setIsFetching(true)
    setIsError(false)
    try {
      const update = await electronService.boost().listProcesses()
      applyUpdate(update)
    } catch (err) {
      setIsError(true)
      setError(err instanceof Error ? err : new Error('Failed to list processes'))
      setIsLoading(false)
      setIsFetching(false)
    }
  }, [applyUpdate])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const start = async (): Promise<void> => {
      try {
        const update = await electronService.boost().listProcesses()
        if (cancelled) return
        applyUpdate(update)

        unsubscribe = electronService.boost().onProcessesUpdate((next) => {
          if (!cancelled) applyUpdate(next)
        })

        await electronService.boost().startProcessWatch()
        if (!cancelled) setIsLive(true)
      } catch (err) {
        if (cancelled) return
        setIsError(true)
        setError(err instanceof Error ? err : new Error('Failed to start live process watch'))
        setIsLoading(false)
        setIsLive(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      unsubscribe?.()
      setIsLive(false)
      void electronService.boost().stopProcessWatch().catch(() => undefined)
    }
  }, [applyUpdate])

  return {
    processes,
    updatedAt,
    isLoading,
    isFetching,
    isError,
    error,
    isLive,
    refresh
  }
}

export function useBoostProgress(active: boolean) {
  const [progress, setProgress] = useState<BoostProgressEvent | null>(null)

  useEffect(() => {
    if (!active) {
      setProgress(null)
      return
    }

    const unsubscribe = electronService.boost().onProgress((event) => {
      setProgress(event)
    })

    return () => {
      unsubscribe()
    }
  }, [active])

  return progress
}

export function useRunBoost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: BoostOptions) => {
      return electronService.boost().execute(options)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['boost'] })
      void queryClient.invalidateQueries({ queryKey: ['system'] })
    }
  })
}

export function useCancelBoost() {
  return useMutation({
    mutationFn: () => electronService.boost().cancel()
  })
}

export function useStopBackgroundProcesses() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (targets: Array<{ pid: number; name: string }>) => {
      if (targets.length === 0) {
        return {
          cancelled: true as const,
          terminated: 0,
          failed: [] as Array<{ pid: number; error: string }>,
          skipped: [] as Array<{ pid: number; reason: string }>,
          detail: 'No processes selected'
        }
      }

      const label =
        targets.length === 1
          ? `"${targets[0].name}" (PID ${targets[0].pid})`
          : `${targets.length} background apps`

      const confirmed = await electronService.dialog().message({
        type: 'warning',
        title: 'Stop background app?',
        message: `Stop ${label} now?`,
        detail:
          'Unsaved work in those apps may be lost. System-critical processes cannot be stopped.',
        buttons: ['Cancel', 'Stop']
      })

      if (confirmed.response !== 1) {
        return {
          cancelled: true as const,
          terminated: 0,
          failed: [] as Array<{ pid: number; error: string }>,
          skipped: [] as Array<{ pid: number; reason: string }>,
          detail: 'Cancelled'
        }
      }

      const result = await electronService.boost().terminateProcesses(targets.map((t) => t.pid))
      return { ...result, cancelled: false as const }
    },
    onSuccess: (result) => {
      if (result.cancelled) return
      void queryClient.invalidateQueries({ queryKey: ['boost'] })
    }
  })
}

export type { BoostResult }

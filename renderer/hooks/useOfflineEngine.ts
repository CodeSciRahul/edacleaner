import { useEffect } from 'react'
import { electronService } from '@/services/electron-service'
import { useOfflineStore } from '@/store/offline-store'
import type { SyncProgressEvent } from '@shared/interfaces'

const QUEUE_POLL_MS = 8_000

/**
 * Subscribes the renderer to main-process offline engine signals.
 * Mount once (AppShell). Does not alter app workflows — status only.
 */
export function useOfflineEngine(): void {
  useEffect(() => {
    let cancelled = false
    let unsubNetwork: (() => void) | undefined
    let unsubSync: (() => void) | undefined
    let unsubAuth: (() => void) | undefined
    let pollTimer: ReturnType<typeof setInterval> | undefined

    const refreshQueue = async (): Promise<void> => {
      try {
        const queue = await electronService.sync().getQueueStats()
        if (!cancelled) useOfflineStore.getState().setQueue(queue)
      } catch {
        // Offline engine may be unavailable during early boot.
      }
    }

    const refreshStatus = async (): Promise<void> => {
      try {
        const [network, syncStatus, session] = await Promise.all([
          electronService.offline().getNetworkStatus(),
          electronService.sync().getStatus(),
          electronService.auth().getSession().catch(() => null)
        ])

        if (cancelled) return

        const { setNetwork, setSyncProgress, setQueue, setLastSyncAt, markReady } =
          useOfflineStore.getState()

        setNetwork(network.online, network.status)
        setQueue(syncStatus.queue)
        setSyncProgress({
          running: syncStatus.running,
          phase: syncStatus.lastProgress?.phase ?? 'idle',
          message: syncStatus.lastProgress?.message ?? ''
        })

        if (session?.lastSyncedAt) {
          setLastSyncAt(session.lastSyncedAt)
        }

        markReady()
      } catch {
        if (!cancelled) useOfflineStore.getState().markReady()
      }
    }

    const onSyncProgress = (event: SyncProgressEvent): void => {
      if (cancelled) return
      const { setSyncProgress, setLastSyncAt } = useOfflineStore.getState()
      setSyncProgress({
        running: event.running,
        phase: event.phase,
        message: event.message
      })

      if (
        !event.running &&
        (event.phase === 'completed' || event.phase === 'error')
      ) {
        setLastSyncAt(Date.now())
        void refreshQueue()
      }
    }

    const start = async (): Promise<void> => {
      await refreshStatus()
      if (cancelled) return

      try {
        unsubNetwork = electronService.offline().onNetworkStatusChanged((snapshot) => {
          if (cancelled) return
          useOfflineStore.getState().setNetwork(snapshot.online, snapshot.status)
          if (snapshot.online) void refreshQueue()
        })
        await electronService.offline().watchNetwork()
      } catch {
        // Network push unavailable — status still seeded above.
      }

      try {
        unsubSync = electronService.sync().onProgress(onSyncProgress)
      } catch {
        // Sync progress push unavailable.
      }

      try {
        unsubAuth = electronService.auth().onSessionChanged((event) => {
          if (cancelled) return
          if (event.session.lastSyncedAt) {
            useOfflineStore.getState().setLastSyncAt(event.session.lastSyncedAt)
          }
        })
      } catch {
        // Auth session push unavailable.
      }

      pollTimer = setInterval(() => {
        void refreshQueue()
      }, QUEUE_POLL_MS)
    }

    void start()

    return () => {
      cancelled = true
      unsubNetwork?.()
      unsubSync?.()
      unsubAuth?.()
      if (pollTimer) clearInterval(pollTimer)
      void electronService.offline().unwatchNetwork().catch(() => undefined)
    }
  }, [])
}

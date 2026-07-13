import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  clearReportsHistory,
  loadReportsHistory,
  subscribeReportsHistory,
  type ReportsHistoryRecord
} from '@/features/reports/lib/activity-history'
import { computeReportsAnalytics } from '@/features/reports/lib/reports-analytics'

/**
 * Hydrates Reports activity history and stays in sync when other features append.
 */
export function useReportsHistory() {
  const [history, setHistory] = useState<ReportsHistoryRecord>(() => createInitial())
  const [hydrated, setHydrated] = useState(false)
  const [animateKey, setAnimateKey] = useState(0)

  useEffect(() => {
    setHistory(loadReportsHistory())
    setHydrated(true)

    return subscribeReportsHistory(() => {
      setHistory(loadReportsHistory())
      setAnimateKey((k) => k + 1)
    })
  }, [])

  const clearHistory = useCallback(() => {
    const next = clearReportsHistory()
    setHistory(next)
    setAnimateKey((k) => k + 1)
    return next
  }, [])

  const analytics = useMemo(
    () => (history.entries.length > 0 ? computeReportsAnalytics(history) : null),
    [history]
  )

  return {
    history,
    hydrated,
    animateKey,
    hasHistory: history.entries.length > 0,
    analytics,
    clearHistory
  }
}

function createInitial(): ReportsHistoryRecord {
  if (typeof window === 'undefined') {
    return {
      version: 1,
      entries: [],
      totals: {
        cleanupCount: 0,
        scanCount: 0,
        boostCount: 0,
        storageDeleteCount: 0,
        bytesFreed: 0,
        lastActivityAt: null,
        lastScanAt: null
      },
      dailyBytesFreed: []
    }
  }
  return loadReportsHistory()
}

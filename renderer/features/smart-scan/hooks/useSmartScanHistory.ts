import { useCallback, useEffect, useState } from 'react'
import type { SmartScanResult } from '@shared/interfaces'
import {
  loadSmartScanHistory,
  saveSmartScanHistory,
  type SmartScanPersistedRecord
} from '@/features/smart-scan/lib/scan-history'

/**
 * Loads persisted Smart Scan history on mount and updates it after each success.
 */
export function useSmartScanHistory() {
  const [history, setHistory] = useState<SmartScanPersistedRecord | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [animateKey, setAnimateKey] = useState(0)

  useEffect(() => {
    setHistory(loadSmartScanHistory())
    setHydrated(true)
  }, [])

  const persistResult = useCallback((result: SmartScanResult) => {
    const next = saveSmartScanHistory(result)
    setHistory(next)
    setAnimateKey((k) => k + 1)
    return next
  }, [])

  return {
    history,
    hydrated,
    animateKey,
    hasHistory: Boolean(history),
    persistResult
  }
}

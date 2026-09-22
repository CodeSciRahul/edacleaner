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

  useEffect(() => {
    setHistory(loadSmartScanHistory())
    setHydrated(true)

    const onPatched = (): void => {
      setHistory(loadSmartScanHistory())
    }
    window.addEventListener('eda-smart-scan-history-updated', onPatched)
    return () => window.removeEventListener('eda-smart-scan-history-updated', onPatched)
  }, [])

  const persistResult = useCallback((result: SmartScanResult) => {
    const next = saveSmartScanHistory(result)
    setHistory(next)
    return next
  }, [])

  return {
    history,
    hydrated,
    hasHistory: Boolean(history),
    persistResult
  }
}

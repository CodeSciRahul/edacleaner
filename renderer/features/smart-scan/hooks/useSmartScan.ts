import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { electronService } from '@/services/electron-service'
import type { SmartScanProgressEvent, SmartScanResult } from '@shared/interfaces'

export function useSmartScanProgress(active: boolean) {
  const [progress, setProgress] = useState<SmartScanProgressEvent | null>(null)

  useEffect(() => {
    if (!active) {
      setProgress(null)
      return
    }

    const unsubscribe = electronService.smartScan().onProgress((event) => {
      setProgress(event)
    })

    return () => {
      unsubscribe()
    }
  }, [active])

  return progress
}

export function useRunSmartScan() {
  return useMutation({
    mutationFn: () => electronService.smartScan().run()
  })
}

export function useCancelSmartScan() {
  return useMutation({
    mutationFn: () => electronService.smartScan().cancel()
  })
}

export type { SmartScanResult, SmartScanProgressEvent }

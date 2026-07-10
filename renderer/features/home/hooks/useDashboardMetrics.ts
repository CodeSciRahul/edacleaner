import { useMemo } from 'react'
import { useSystemInfo } from '@/features/home/hooks/useHomeData'
import { formatBytes } from '@shared/utils'

export interface DashboardMetrics {
  cpu: number
  ram: number
  disk: number
  battery: number
  network: number
  junkSize: string
  ramRecoverable: string
  startupCount: number
  driverUpdates: number
}

export function useDashboardMetrics() {
  const { data: systemInfo, isLoading } = useSystemInfo()
  console.log("systemInfo", systemInfo)

  const metrics = useMemo<DashboardMetrics | null>(() => {
    if (!systemInfo) return null

    const ramUsed = ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100

    return {
      cpu: Math.min(95, 18 + systemInfo.cpuCount * 4),
      ram: Math.round(ramUsed),
      disk: 62,
      battery: 87,
      network: 24,
      junkSize: '2.4 GB',
      ramRecoverable: formatBytes(systemInfo.freeMemory * 0.15),
      startupCount: 8,
      driverUpdates: 3
    }
  }, [systemInfo])

  return { metrics, isLoading }
}

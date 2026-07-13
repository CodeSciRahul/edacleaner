import { useQuery } from '@tanstack/react-query'
import { electronService } from '@/services/electron-service'
import { formatBytes } from '@shared/utils'
import type { BoostProcessInfo } from '@shared/interfaces'

export interface DashboardMetrics {
  cpu: number
  ram: number
  disk: number
  freeMemoryLabel: string
  diskFreeLabel: string
  topProcesses: Array<{ name: string; memoryBytes: number }>
}

function diskUsedPercent(used: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)))
}

/**
 * Live snapshot for the home Dashboard — real metrics only (no mock charts).
 */
export function useDashboardMetrics() {
  const sampleQuery = useQuery({
    queryKey: ['dashboard', 'metrics-sample'],
    queryFn: () => electronService.system().getMetricsSample(),
    refetchInterval: 5_000
  })

  const drivesQuery = useQuery({
    queryKey: ['dashboard', 'drives'],
    queryFn: () => electronService.storage().getDrives(),
    staleTime: 60_000
  })

  const snapshotQuery = useQuery({
    queryKey: ['dashboard', 'boost-snapshot'],
    queryFn: () => electronService.boost().getSnapshot(),
    refetchInterval: 12_000
  })

  const isLoading =
    (sampleQuery.isLoading && !sampleQuery.data) ||
    (drivesQuery.isLoading && !drivesQuery.data)

  const sample = sampleQuery.data
  const drives = drivesQuery.data ?? []
  const primaryDrive = drives[0]
  const topProcesses = mapTopProcesses(snapshotQuery.data?.topProcesses ?? [])

  const metrics: DashboardMetrics | null = sample
    ? {
        cpu: Math.round(sample.cpuPercent),
        ram: Math.round(sample.memoryPercent),
        disk: primaryDrive
          ? diskUsedPercent(primaryDrive.usedBytes, primaryDrive.totalBytes)
          : 0,
        freeMemoryLabel: formatBytes(sample.memory.free),
        diskFreeLabel: primaryDrive ? formatBytes(primaryDrive.freeBytes) : '—',
        topProcesses
      }
    : null

  return {
    metrics,
    isLoading,
    isRefreshing: sampleQuery.isFetching && Boolean(sampleQuery.data)
  }
}

function mapTopProcesses(
  processes: BoostProcessInfo[]
): Array<{ name: string; memoryBytes: number }> {
  return processes
    .slice()
    .sort((a, b) => b.memoryBytes - a.memoryBytes)
    .slice(0, 5)
    .map((p) => ({
      name: p.name || p.path || `PID ${p.pid}`,
      memoryBytes: p.memoryBytes
    }))
}

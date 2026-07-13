import {
  averageHealthScore,
  buildWeekTrend,
  countOptimizations,
  type ActivityEntry,
  type ReportsHistoryRecord,
  type ReportsTotals
} from '@/features/reports/lib/activity-history'

export type HealthBand = 'excellent' | 'good' | 'fair' | 'attention'

export interface TrendPoint {
  label: string
  value: number
  dayKey: string
}

export interface ReportsAnalytics {
  healthScore: number | null
  healthBand: HealthBand
  avgHealth: number | null
  totals: ReportsTotals
  optimizations: number
  lifetimeBytesFreed: number
  memoryReclaimedBytes: number
  filesTouched: number
  issuesFoundLatest: number
  issuesFoundLifetime: number
  issuesResolved: number
  lastScan: Extract<ActivityEntry, { kind: 'smart-scan' }> | null
  lastActivityAt: number | null
  weekStorageGb: TrendPoint[]
  weekCleanupCounts: TrendPoint[]
  weekScanCounts: TrendPoint[]
  weekActivityCounts: TrendPoint[]
  mix: {
    cleanup: number
    scan: number
    boost: number
    storage: number
  }
  hasTrendData: boolean
  hasScanData: boolean
}

function dayKeyFromTimestamp(at: number): string {
  const d = new Date(at)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekDayPoints(
  countByDay: Map<string, number>,
  now = Date.now()
): TrendPoint[] {
  const points: TrendPoint[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - i)
    const key = dayKeyFromTimestamp(date.getTime())
    const label = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
    points.push({
      label,
      dayKey: key,
      value: countByDay.get(key) ?? 0
    })
  }
  return points
}

export function healthBandFromScore(score: number | null): HealthBand {
  if (score == null) return 'fair'
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'good'
  if (score >= 50) return 'fair'
  return 'attention'
}

export function computeReportsAnalytics(
  history: ReportsHistoryRecord,
  now = Date.now()
): ReportsAnalytics {
  const entries = history.entries.filter((e) => !e.cancelled)
  const scans = entries.filter((e): e is Extract<ActivityEntry, { kind: 'smart-scan' }> =>
    e.kind === 'smart-scan'
  )
  const cleanups = entries.filter((e) => e.kind === 'cleanup')
  const boosts = entries.filter(
    (e): e is Extract<ActivityEntry, { kind: 'boost' }> => e.kind === 'boost'
  )
  const storage = entries.filter((e) => e.kind === 'storage-delete')

  const lastScan = scans[0] ?? null
  const avgHealth = averageHealthScore(entries)
  const healthScore = lastScan?.healthScore ?? avgHealth

  // Issues: latest open + lifetime found; resolved via scan deltas + reclaiming actions
  const issuesFoundLatest = lastScan?.issuesFound ?? 0
  const issuesFoundLifetime = scans.reduce((sum, s) => sum + s.issuesFound, 0)

  const chronologicalScans = [...scans].sort((a, b) => a.at - b.at)
  let issuesResolvedFromScans = 0
  for (let i = 1; i < chronologicalScans.length; i++) {
    const prev = chronologicalScans[i - 1]!
    const curr = chronologicalScans[i]!
    if (prev.issuesFound > curr.issuesFound) {
      issuesResolvedFromScans += prev.issuesFound - curr.issuesFound
    }
  }
  const reclaimingActions = [...cleanups, ...boosts, ...storage].filter(
    (e) => e.bytesFreed > 0 || (e.kind === 'boost' && e.diskFreedBytes > 0)
  ).length
  const issuesResolved = issuesResolvedFromScans + reclaimingActions

  const memoryReclaimedBytes = boosts.reduce((sum, b) => sum + b.memoryReclaimedBytes, 0)
  const filesTouched = entries.reduce((sum, e) => sum + e.itemsAffected, 0)

  const cleanupByDay = new Map<string, number>()
  const scanByDay = new Map<string, number>()
  const activityByDay = new Map<string, number>()
  for (const entry of entries) {
    const key = dayKeyFromTimestamp(entry.at)
    activityByDay.set(key, (activityByDay.get(key) ?? 0) + 1)
    if (entry.kind === 'cleanup') {
      cleanupByDay.set(key, (cleanupByDay.get(key) ?? 0) + 1)
    }
    if (entry.kind === 'smart-scan') {
      scanByDay.set(key, (scanByDay.get(key) ?? 0) + 1)
    }
  }

  const weekStorageGb = buildWeekTrend(history.dailyBytesFreed, now)
  const weekCleanupCounts = weekDayPoints(cleanupByDay, now)
  const weekScanCounts = weekDayPoints(scanByDay, now)
  const weekActivityCounts = weekDayPoints(activityByDay, now)

  const totalEvents =
    history.totals.cleanupCount +
    history.totals.scanCount +
    history.totals.boostCount +
    history.totals.storageDeleteCount
  const pct = (n: number) => (totalEvents === 0 ? 0 : Math.round((n / totalEvents) * 100))

  return {
    healthScore,
    healthBand: healthBandFromScore(healthScore),
    avgHealth,
    totals: history.totals,
    optimizations: countOptimizations(history.totals),
    lifetimeBytesFreed: history.totals.bytesFreed,
    memoryReclaimedBytes,
    filesTouched,
    issuesFoundLatest,
    issuesFoundLifetime,
    issuesResolved,
    lastScan,
    lastActivityAt: history.totals.lastActivityAt,
    weekStorageGb,
    weekCleanupCounts,
    weekScanCounts,
    weekActivityCounts,
    mix: {
      cleanup: pct(history.totals.cleanupCount),
      scan: pct(history.totals.scanCount),
      boost: pct(history.totals.boostCount),
      storage: pct(history.totals.storageDeleteCount)
    },
    hasTrendData: weekStorageGb.some((p) => p.value > 0),
    hasScanData: scans.length > 0
  }
}

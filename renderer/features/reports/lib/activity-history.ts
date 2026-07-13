import type { CleanupCategoryId, CleanupResult, SmartScanResult, BoostResult } from '@shared/interfaces'

export const REPORTS_STORAGE_KEY = 'eda-cleaner-activity-history'
const STORAGE_VERSION = 1 as const
const MAX_ENTRIES = 100
const MAX_DAILY_DAYS = 14

export type ActivityKind = 'smart-scan' | 'cleanup' | 'boost' | 'storage-delete'

export type StorageDeleteSource = 'duplicates' | 'large-files'

export interface ActivityEntryBase {
  id: string
  kind: ActivityKind
  at: number
  durationMs: number
  success: boolean
  cancelled: boolean
  bytesFreed: number
  itemsAffected: number
}

export type ActivityEntry =
  | (ActivityEntryBase & {
      kind: 'smart-scan'
      healthScore: number
      issuesFound: number
      filesScanned: number
      reclaimableBytes: number
    })
  | (ActivityEntryBase & {
      kind: 'cleanup'
      categories: CleanupCategoryId[]
      filesRemoved: number
    })
  | (ActivityEntryBase & {
      kind: 'boost'
      memoryReclaimedBytes: number
      processesTerminated: number
      diskFreedBytes: number
    })
  | (ActivityEntryBase & {
      kind: 'storage-delete'
      source: StorageDeleteSource
      deletedCount: number
      failedCount: number
    })

export interface ReportsTotals {
  cleanupCount: number
  scanCount: number
  boostCount: number
  storageDeleteCount: number
  bytesFreed: number
  lastActivityAt: number | null
  lastScanAt: number | null
}

export interface DailyBytesBucket {
  dayKey: string
  bytes: number
}

export interface ReportsHistoryRecord {
  version: typeof STORAGE_VERSION
  entries: ActivityEntry[]
  totals: ReportsTotals
  dailyBytesFreed: DailyBytesBucket[]
}

const emptyTotals = (): ReportsTotals => ({
  cleanupCount: 0,
  scanCount: 0,
  boostCount: 0,
  storageDeleteCount: 0,
  bytesFreed: 0,
  lastActivityAt: null,
  lastScanAt: null
})

export function createEmptyReportsHistory(): ReportsHistoryRecord {
  return {
    version: STORAGE_VERSION,
    entries: [],
    totals: emptyTotals(),
    dailyBytesFreed: []
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isCleanupCategoryId(value: unknown): value is CleanupCategoryId {
  return (
    value === 'junk' ||
    value === 'temp' ||
    value === 'recycle' ||
    value === 'browser' ||
    value === 'system'
  )
}

function isValidEntry(value: unknown): value is ActivityEntry {
  if (value == null || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  if (typeof e.id !== 'string' || e.id.length === 0) return false
  if (!isFiniteNumber(e.at) || !isFiniteNumber(e.durationMs)) return false
  if (typeof e.success !== 'boolean' || typeof e.cancelled !== 'boolean') return false
  if (!isFiniteNumber(e.bytesFreed) || !isFiniteNumber(e.itemsAffected)) return false

  switch (e.kind) {
    case 'smart-scan':
      return (
        isFiniteNumber(e.healthScore) &&
        isFiniteNumber(e.issuesFound) &&
        isFiniteNumber(e.filesScanned) &&
        isFiniteNumber(e.reclaimableBytes)
      )
    case 'cleanup':
      return (
        Array.isArray(e.categories) &&
        e.categories.every(isCleanupCategoryId) &&
        isFiniteNumber(e.filesRemoved)
      )
    case 'boost':
      return (
        isFiniteNumber(e.memoryReclaimedBytes) &&
        isFiniteNumber(e.processesTerminated) &&
        isFiniteNumber(e.diskFreedBytes)
      )
    case 'storage-delete':
      return (
        (e.source === 'duplicates' || e.source === 'large-files') &&
        isFiniteNumber(e.deletedCount) &&
        isFiniteNumber(e.failedCount)
      )
    default:
      return false
  }
}

function isValidDailyBucket(value: unknown): value is DailyBytesBucket {
  if (value == null || typeof value !== 'object') return false
  const b = value as Record<string, unknown>
  return typeof b.dayKey === 'string' && isFiniteNumber(b.bytes)
}

function isValidTotals(value: unknown): value is ReportsTotals {
  if (value == null || typeof value !== 'object') return false
  const t = value as Record<string, unknown>
  return (
    isFiniteNumber(t.cleanupCount) &&
    isFiniteNumber(t.scanCount) &&
    isFiniteNumber(t.boostCount) &&
    isFiniteNumber(t.storageDeleteCount) &&
    isFiniteNumber(t.bytesFreed) &&
    (t.lastActivityAt === null || isFiniteNumber(t.lastActivityAt)) &&
    (t.lastScanAt === null || isFiniteNumber(t.lastScanAt))
  )
}

function dayKeyFromTimestamp(at: number): string {
  const d = new Date(at)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `act-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

function recomputeTotals(entries: ActivityEntry[]): ReportsTotals {
  const totals = emptyTotals()
  for (const entry of entries) {
    if (entry.cancelled) continue
    totals.lastActivityAt = Math.max(totals.lastActivityAt ?? 0, entry.at) || entry.at
    switch (entry.kind) {
      case 'cleanup':
        totals.cleanupCount += 1
        totals.bytesFreed += Math.max(0, entry.bytesFreed)
        break
      case 'smart-scan':
        totals.scanCount += 1
        totals.lastScanAt = Math.max(totals.lastScanAt ?? 0, entry.at) || entry.at
        break
      case 'boost':
        totals.boostCount += 1
        totals.bytesFreed += Math.max(0, entry.diskFreedBytes)
        break
      case 'storage-delete':
        totals.storageDeleteCount += 1
        totals.bytesFreed += Math.max(0, entry.bytesFreed)
        break
    }
  }
  if (totals.lastActivityAt === 0) totals.lastActivityAt = null
  if (totals.lastScanAt === 0) totals.lastScanAt = null
  return totals
}

function recomputeDaily(entries: ActivityEntry[]): DailyBytesBucket[] {
  const map = new Map<string, number>()
  for (const entry of entries) {
    if (entry.cancelled) continue
    const bytes =
      entry.kind === 'boost'
        ? entry.diskFreedBytes
        : entry.kind === 'cleanup' || entry.kind === 'storage-delete'
          ? entry.bytesFreed
          : 0
    if (bytes <= 0) continue
    const key = dayKeyFromTimestamp(entry.at)
    map.set(key, (map.get(key) ?? 0) + bytes)
  }

  return [...map.entries()]
    .map(([dayKey, bytes]) => ({ dayKey, bytes }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    .slice(-MAX_DAILY_DAYS)
}

const listeners = new Set<() => void>()

export function subscribeReportsHistory(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      // ignore subscriber errors
    }
  }
}

function persist(record: ReportsHistoryRecord): void {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Quota / private mode
  }
  notifyListeners()
}

/**
 * Loads persisted activity history. Returns empty record when missing or corrupt.
 */
export function loadReportsHistory(): ReportsHistoryRecord {
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY)
    if (!raw) return createEmptyReportsHistory()

    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== 'object') return createEmptyReportsHistory()

    const data = parsed as Record<string, unknown>
    if (data.version !== STORAGE_VERSION) return createEmptyReportsHistory()
    if (!Array.isArray(data.entries)) return createEmptyReportsHistory()

    const entries = data.entries.filter(isValidEntry).slice(0, MAX_ENTRIES)
    const daily =
      Array.isArray(data.dailyBytesFreed) && data.dailyBytesFreed.every(isValidDailyBucket)
        ? data.dailyBytesFreed.slice(-MAX_DAILY_DAYS)
        : recomputeDaily(entries)
    const totals = isValidTotals(data.totals) ? data.totals : recomputeTotals(entries)

    return {
      version: STORAGE_VERSION,
      entries,
      totals,
      dailyBytesFreed: daily
    }
  } catch {
    return createEmptyReportsHistory()
  }
}

function commitEntry(entry: ActivityEntry): ReportsHistoryRecord {
  const current = loadReportsHistory()
  const entries = [entry, ...current.entries].slice(0, MAX_ENTRIES)
  const record: ReportsHistoryRecord = {
    version: STORAGE_VERSION,
    entries,
    totals: recomputeTotals(entries),
    dailyBytesFreed: recomputeDaily(entries)
  }
  persist(record)
  return record
}

export function clearReportsHistory(): ReportsHistoryRecord {
  const empty = createEmptyReportsHistory()
  try {
    localStorage.removeItem(REPORTS_STORAGE_KEY)
  } catch {
    // ignore
  }
  persist(empty)
  return empty
}

export function appendCleanupActivity(result: CleanupResult): ReportsHistoryRecord | null {
  if (result.cancelled) return null
  const categories = result.steps
    .filter((s) => s.status === 'completed' || s.status === 'skipped')
    .map((s) => s.id)

  return commitEntry({
    id: newId(),
    kind: 'cleanup',
    at: Date.now(),
    durationMs: Math.max(0, result.durationMs),
    success: result.success,
    cancelled: false,
    bytesFreed: Math.max(0, result.bytesFreed),
    itemsAffected: Math.max(0, result.filesRemoved),
    categories,
    filesRemoved: Math.max(0, result.filesRemoved)
  })
}

export function appendSmartScanActivity(result: SmartScanResult): ReportsHistoryRecord | null {
  return commitEntry({
    id: newId(),
    kind: 'smart-scan',
    at: result.scannedAt || Date.now(),
    durationMs: Math.max(0, result.durationMs),
    success: true,
    cancelled: false,
    bytesFreed: 0,
    itemsAffected: Math.max(0, result.filesScanned ?? 0),
    healthScore: Math.min(100, Math.max(0, Math.round(result.healthScore))),
    issuesFound: Math.max(0, result.areasNeedingAttention),
    filesScanned: Math.max(0, result.filesScanned ?? 0),
    reclaimableBytes: Math.max(0, result.totalReclaimableBytes)
  })
}

export function appendBoostActivity(result: BoostResult): ReportsHistoryRecord | null {
  if (result.cancelled) return null
  return commitEntry({
    id: newId(),
    kind: 'boost',
    at: Date.now(),
    durationMs: Math.max(0, result.durationMs),
    success: result.success,
    cancelled: false,
    bytesFreed: Math.max(0, result.diskFreedBytes),
    itemsAffected: Math.max(0, result.processesTerminated),
    memoryReclaimedBytes: Math.max(0, result.memoryReclaimedBytes),
    processesTerminated: Math.max(0, result.processesTerminated),
    diskFreedBytes: Math.max(0, result.diskFreedBytes)
  })
}

export function appendStorageDeleteActivity(input: {
  source: StorageDeleteSource
  deletedCount: number
  failedCount: number
  estimatedBytes: number
  durationMs?: number
}): ReportsHistoryRecord | null {
  if (input.deletedCount <= 0) return null
  return commitEntry({
    id: newId(),
    kind: 'storage-delete',
    at: Date.now(),
    durationMs: Math.max(0, input.durationMs ?? 0),
    success: input.failedCount === 0,
    cancelled: false,
    bytesFreed: Math.max(0, input.estimatedBytes),
    itemsAffected: input.deletedCount,
    source: input.source,
    deletedCount: input.deletedCount,
    failedCount: Math.max(0, input.failedCount)
  })
}

/** Last 7 local days for the reclaim chart (values in GB). */
export function buildWeekTrend(
  daily: DailyBytesBucket[],
  now = Date.now()
): Array<{ label: string; value: number; dayKey: string }> {
  const byKey = new Map(daily.map((d) => [d.dayKey, d.bytes]))
  const points: Array<{ label: string; value: number; dayKey: string }> = []

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - i)
    const key = dayKeyFromTimestamp(date.getTime())
    const bytes = byKey.get(key) ?? 0
    const label = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
    points.push({
      label,
      dayKey: key,
      value: Number((bytes / (1024 * 1024 * 1024)).toFixed(3))
    })
  }

  return points
}

export function countOptimizations(totals: ReportsTotals): number {
  return totals.cleanupCount + totals.boostCount + totals.storageDeleteCount
}

export function averageHealthScore(entries: ActivityEntry[]): number | null {
  const scans = entries.filter((e) => e.kind === 'smart-scan') as Array<
    Extract<ActivityEntry, { kind: 'smart-scan' }>
  >
  if (scans.length === 0) return null
  const sum = scans.reduce((acc, s) => acc + s.healthScore, 0)
  return Math.round(sum / scans.length)
}

export function activityHref(entry: ActivityEntry): string {
  switch (entry.kind) {
    case 'cleanup':
      return '/cleanup'
    case 'smart-scan':
      return '/smart-scan'
    case 'boost':
      return '/performance'
    case 'storage-delete':
      return entry.source === 'duplicates' ? '/storage/duplicates' : '/storage/large-files'
  }
}

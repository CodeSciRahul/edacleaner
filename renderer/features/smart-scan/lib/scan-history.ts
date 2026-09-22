import type { SmartScanAreaResult, SmartScanResult } from '@shared/interfaces'
import { formatBytes } from '@shared/utils'
import { useLanguageStore } from '@/i18n/language-store'

const STORAGE_KEY = 'eda-cleaner-smart-scan-history'
const STORAGE_VERSION = 1 as const

export interface SmartScanPersistedRecord {
  version: typeof STORAGE_VERSION
  /** Full last successful scan — used to restore the results UI */
  lastResult: SmartScanResult
  /** Snapshot metrics for the summary card */
  lastScanAt: number
  filesScanned: number
  issuesFound: number
  issuesResolved: number
  storageReclaimedBytes: number
  durationMs: number
  healthScore: number
  totalScans: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidArea(area: unknown): area is SmartScanAreaResult {
  if (area == null || typeof area !== 'object') return false
  const a = area as Record<string, unknown>
  return (
    typeof a.id === 'string' &&
    typeof a.label === 'string' &&
    typeof a.description === 'string' &&
    typeof a.status === 'string' &&
    typeof a.finding === 'string' &&
    typeof a.href === 'string'
  )
}

function isValidResult(result: unknown): result is SmartScanResult {
  if (result == null || typeof result !== 'object') return false
  const r = result as Record<string, unknown>
  return (
    isFiniteNumber(r.scannedAt) &&
    isFiniteNumber(r.durationMs) &&
    typeof r.platform === 'string' &&
    isFiniteNumber(r.healthScore) &&
    Array.isArray(r.areas) &&
    r.areas.every(isValidArea) &&
    isFiniteNumber(r.totalReclaimableBytes) &&
    isFiniteNumber(r.duplicateBytes) &&
    isFiniteNumber(r.estimatedBootSeconds) &&
    isFiniteNumber(r.areasNeedingAttention) &&
    isFiniteNumber(r.filesScanned ?? 0) &&
    typeof r.summaryTitle === 'string' &&
    typeof r.summaryMessage === 'string' &&
    Array.isArray(r.warnings)
  )
}

function normalizeResult(result: SmartScanResult): SmartScanResult {
  return {
    ...result,
    filesScanned: result.filesScanned ?? 0,
    areas: result.areas.map((area) => ({
      ...area,
      filesScanned: area.filesScanned ?? 0
    }))
  }
}

/**
 * Loads persisted Smart Scan history. Returns null when missing or corrupt.
 */
export function loadSmartScanHistory(): SmartScanPersistedRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== 'object') return null

    const data = parsed as Record<string, unknown>
    if (data.version !== STORAGE_VERSION) return null
    if (!isValidResult(data.lastResult)) return null
    if (!isFiniteNumber(data.lastScanAt)) return null
    if (!isFiniteNumber(data.filesScanned)) return null
    if (!isFiniteNumber(data.issuesFound)) return null
    if (!isFiniteNumber(data.issuesResolved)) return null
    if (!isFiniteNumber(data.storageReclaimedBytes)) return null
    if (!isFiniteNumber(data.durationMs)) return null
    if (!isFiniteNumber(data.healthScore)) return null
    if (!isFiniteNumber(data.totalScans)) return null

    return {
      version: STORAGE_VERSION,
      lastResult: normalizeResult(data.lastResult),
      lastScanAt: data.lastScanAt,
      filesScanned: Math.max(0, Math.round(data.filesScanned)),
      issuesFound: Math.max(0, Math.round(data.issuesFound)),
      issuesResolved: Math.max(0, Math.round(data.issuesResolved)),
      storageReclaimedBytes: Math.max(0, data.storageReclaimedBytes),
      durationMs: Math.max(0, Math.round(data.durationMs)),
      healthScore: Math.min(100, Math.max(0, Math.round(data.healthScore))),
      totalScans: Math.max(1, Math.round(data.totalScans))
    }
  } catch {
    return null
  }
}

/**
 * Saves the latest successful scan, updating lifetime resolved / reclaimed stats.
 */
export function saveSmartScanHistory(
  result: SmartScanResult,
  previous: SmartScanPersistedRecord | null = loadSmartScanHistory()
): SmartScanPersistedRecord {
  const normalized = normalizeResult(result)
  const issuesFound = normalized.areasNeedingAttention

  const issuesResolvedDelta = previous
    ? Math.max(0, previous.issuesFound - issuesFound)
    : 0

  const reclaimedDelta = previous
    ? Math.max(0, previous.lastResult.totalReclaimableBytes - normalized.totalReclaimableBytes)
    : 0

  const record: SmartScanPersistedRecord = {
    version: STORAGE_VERSION,
    lastResult: normalized,
    lastScanAt: normalized.scannedAt,
    filesScanned: normalized.filesScanned,
    issuesFound,
    issuesResolved: (previous?.issuesResolved ?? 0) + issuesResolvedDelta,
    storageReclaimedBytes: (previous?.storageReclaimedBytes ?? 0) + reclaimedDelta,
    durationMs: normalized.durationMs,
    healthScore: normalized.healthScore,
    totalScans: (previous?.totalScans ?? 0) + 1
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Quota / private mode — still return in-memory record for this session
  }

  return record
}

const CLEANUP_GOOD_MAX_BYTES = 64 * 1024 * 1024
const CLEANUP_ISSUE_MIN_BYTES = 2 * 1024 * 1024 * 1024

function computeHealthFromAreas(areas: SmartScanAreaResult[]): number {
  let score = 100
  for (const area of areas) {
    if (area.status === 'issue') score -= 18
    else if (area.status === 'warning') score -= 8
  }
  return Math.max(28, Math.min(98, score))
}

/**
 * After a successful Cleanup run, update the last Smart Scan so Cleanup
 * no longer stuck on "Review" — same idea as Boost score progress.
 */
export function applyCleanupToSmartScanHistory(
  bytesFreed: number
): SmartScanPersistedRecord | null {
  const previous = loadSmartScanHistory()
  if (!previous) return null

  const freed = Math.max(0, bytesFreed)
  const cleanupBefore = previous.lastResult.areas.find((a) => a.id === 'cleanup')
  const wasAttention = cleanupBefore != null && cleanupBefore.status !== 'good'

  const areas = previous.lastResult.areas.map((area) => {
    if (area.id !== 'cleanup') return area

    const prevBytes = Math.max(0, area.reclaimableBytes ?? 0)
    // If estimate was 0 (e.g. recycle-only) but user cleaned, treat as cleared
    const nextBytes =
      freed > 0 ? Math.max(0, prevBytes - freed) : wasAttention ? 0 : prevBytes

    let status: SmartScanAreaResult['status'] = 'good'
    let finding = 'Looking clean — cleanup applied'

    if (nextBytes >= CLEANUP_ISSUE_MIN_BYTES) {
      status = 'issue'
      finding = `${formatBytes(nextBytes)} ready to reclaim`
    } else if (nextBytes >= CLEANUP_GOOD_MAX_BYTES) {
      status = 'warning'
      finding = `${formatBytes(nextBytes)} ready to reclaim`
    } else if (nextBytes > 0) {
      finding = `Looking clean — only ${formatBytes(nextBytes)} of optional clutter`
    }

    return {
      ...area,
      status,
      finding,
      reclaimableBytes: nextBytes,
      metricValue: formatBytes(nextBytes)
    }
  })

  const healthScore = computeHealthFromAreas(areas)
  const areasNeedingAttention = areas.filter((a) => a.status !== 'good').length
  const totalReclaimableBytes = areas.reduce(
    (sum, a) => sum + (a.reclaimableBytes ?? 0),
    0
  )

  const updatedResult: SmartScanResult = {
    ...previous.lastResult,
    areas,
    healthScore,
    areasNeedingAttention,
    totalReclaimableBytes,
    summaryTitle:
      areasNeedingAttention === 0
        ? 'System is healthy'
        : previous.lastResult.summaryTitle,
    summaryMessage:
      areasNeedingAttention === 0
        ? 'Cleanup applied — your PC is looking cleaner.'
        : previous.lastResult.summaryMessage
  }

  const issuesResolvedDelta = Math.max(0, previous.issuesFound - areasNeedingAttention)

  const record: SmartScanPersistedRecord = {
    ...previous,
    lastResult: normalizeResult(updatedResult),
    issuesFound: areasNeedingAttention,
    issuesResolved: previous.issuesResolved + issuesResolvedDelta,
    storageReclaimedBytes: previous.storageReclaimedBytes + freed,
    healthScore
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // ignore persistence errors
  }

  return record
}

export function formatLastScannedAt(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(timestamp))
  } catch {
    return new Date(timestamp).toLocaleString()
  }
}

export function formatRelativeScanTime(timestamp: number, now = Date.now()): string {
  const { t } = useLanguageStore.getState()
  const deltaMs = Math.max(0, now - timestamp)
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return t('smartScan.relative.justNow')
  if (minutes < 60) return t('smartScan.relative.minAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('smartScan.relative.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('smartScan.relative.yesterday')
  if (days < 7) return t('smartScan.relative.daysAgo', { count: days })
  return formatLastScannedAt(timestamp)
}

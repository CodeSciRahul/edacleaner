import type { SmartScanAreaResult, SmartScanResult } from '@shared/interfaces'

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
  const deltaMs = Math.max(0, now - timestamp)
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return formatLastScannedAt(timestamp)
}

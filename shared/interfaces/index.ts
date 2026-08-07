import type { Platform, UpdateStatus } from '@shared/enums'

export interface SystemInfo {
  platform: Platform
  arch: string
  hostname: string
  osVersion: string
  totalMemory: number
  freeMemory: number
  cpuCount: number
}

export interface MemoryInfo {
  total: number
  free: number
  used: number
  usedPercent: number
}

/** Live system telemetry sample for Performance charts. */
export interface SystemMetricsSample {
  at: number
  cpuPercent: number
  memoryPercent: number
  memory: MemoryInfo
}

export interface AppInfo {
  name: string
  version: string
  platform: Platform
  isPackaged: boolean
  environment: string
}

export interface FileFilter {
  name: string
  extensions: string[]
}

export interface OpenDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
}

export interface MessageDialogOptions {
  type?: 'info' | 'warning' | 'error' | 'question'
  title?: string
  message: string
  detail?: string
  buttons?: string[]
}

export interface DialogResult {
  canceled: boolean
  filePaths?: string[]
  filePath?: string
  response?: number
}

export interface UpdateInfo {
  status: UpdateStatus
  version?: string
  releaseNotes?: string
  error?: string
}

export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface DriveInfo {
  label: string
  mountPath: string
  usedBytes: number
  totalBytes: number
  freeBytes: number
}

export interface StorageSegment {
  label: string
  bytes: number
  percent: number
  /** Directory to open in the system file manager when the segment is clicked. */
  path?: string
}

export interface StorageUsageResult {
  mountPath: string
  segments: StorageSegment[]
  analyzedBytes: number
}

export interface LargeFile {
  name: string
  path: string
  sizeBytes: number
}

export interface FindLargeFilesOptions {
  rootPath?: string
  minBytes?: number
  limit?: number
}

export interface DuplicateGroup {
  name: string
  paths: string[]
  copies: number
  sizeBytes: number
}

export interface FindDuplicatesOptions {
  rootPath?: string
  minBytes?: number
  limit?: number
}

export interface DeleteFilesResult {
  deleted: string[]
  failed: Array<{ path: string; error: string }>
}

/** Safe Boost optimization identifiers */
export type BoostOperationId =
  | 'clean-temp'
  | 'clean-cache'
  | 'empty-trash'
  | 'flush-dns'
  | 'terminate-processes'
  | 'refresh-stats'

export type BoostStepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'cancelled'

export interface BoostProcessInfo {
  pid: number
  name: string
  memoryBytes: number
  cpuPercent: number
  /** Absolute path to the executable when available. */
  path?: string
  /** Data-URL icon from the OS (when path could be resolved). */
  iconDataUrl?: string
  /** True when terminating this process is considered relatively safe (never system-critical). */
  safeToTerminate: boolean
}

export interface BackgroundProcessesUpdate {
  processes: BoostProcessInfo[]
  updatedAt: number
}

export interface BoostStartupAppInfo {
  id: string
  name: string
  path?: string
  impact: 'high' | 'medium' | 'low' | 'unknown'
  enabled: boolean
  /** Disabling is only a suggestion in v1 — adapters may mark unsupported. */
  canDisable: boolean
  source: string
}

export interface BoostDiskPressure {
  mountPath: string
  freeBytes: number
  totalBytes: number
  usedPercent: number
  isLow: boolean
}

export interface BoostAnalysis {
  generatedAt: number
  memory: MemoryInfo
  diskPressure: BoostDiskPressure | null
  estimatedTempBytes: number
  estimatedCacheBytes: number
  trashSupported: boolean
  dnsFlushSupported: boolean
  processSuggestions: BoostProcessInfo[]
  startupSuggestions: BoostStartupAppInfo[]
  availableOperations: BoostOperationId[]
  unsupportedOperations: Array<{ id: BoostOperationId; reason: string }>
  warnings: string[]
}

export interface BoostOptions {
  cleanTempFiles?: boolean
  cleanAppCaches?: boolean
  emptyTrash?: boolean
  flushDnsCache?: boolean
  /** Explicit PIDs from analysis suggestions; never auto-kill without this list. */
  terminateProcessIds?: number[]
}

export interface TerminateProcessesResult {
  terminated: number
  failed: Array<{ pid: number; error: string }>
  skipped: Array<{ pid: number; reason: string }>
  detail: string
}

export interface BoostStepResult {
  id: BoostOperationId
  label: string
  status: BoostStepStatus
  detail?: string
  bytesFreed?: number
  processesAffected?: number
  error?: string
}

export interface BoostSkippedOp {
  id: BoostOperationId
  reason: string
}

export interface BoostResult {
  success: boolean
  cancelled: boolean
  durationMs: number
  memoryBeforeBytes: number
  memoryAfterBytes: number
  /** Honest free-memory delta (may be 0 if OS did not reclaim yet). */
  memoryReclaimedBytes: number
  tempFilesRemovedBytes: number
  cacheFilesRemovedBytes: number
  diskFreedBytes: number
  processesTerminated: number
  dnsFlushed: boolean
  trashEmptied: boolean
  steps: BoostStepResult[]
  skipped: BoostSkippedOp[]
  warnings: string[]
}

export interface BoostProgressEvent {
  phase: string
  message: string
  percent: number
  currentItem?: string
}

export interface BoostSnapshot {
  memory: MemoryInfo
  topProcesses: BoostProcessInfo[]
  diskPressure: BoostDiskPressure | null
  platform: string
}

export type StartupImpact = 'high' | 'medium' | 'low' | 'unknown'

export type StartupSourceKind =
  | 'registry-hkcu'
  | 'registry-hklm'
  | 'startup-folder'
  | 'uwp-startup-task'
  | 'scheduled-task'
  | 'launch-agent'
  | 'autostart-desktop'
  | 'other'

export interface StartupAppEntry {
  id: string
  name: string
  /** Command line or file path associated with the entry */
  location: string
  source: string
  sourceKind: StartupSourceKind
  enabled: boolean
  /** False for read-only / protected / machine-wide entries */
  canToggle: boolean
  impact: StartupImpact
  /** Optional data URL from app.getFileIcon */
  iconDataUrl?: string
  details?: string
  protectedReason?: string
}

export interface StartupListResult {
  entries: StartupAppEntry[]
  platform: string
  warnings: string[]
  generatedAt: number
}

export interface StartupSetEnabledOptions {
  id: string
  enabled: boolean
}

export interface StartupMutationResult {
  success: boolean
  entry?: StartupAppEntry
  error?: string
}

/** Cleanup category identifiers — extensible for future modules */
export type CleanupCategoryId =
  | 'junk'
  | 'temp'
  | 'recycle'
  | 'browser'
  | 'system'

export type CleanupRiskLevel = 'safe' | 'review'

export type CleanupStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'skipped'
  | 'failed'
  | 'cancelled'

export interface CleanupCategorySummary {
  id: CleanupCategoryId
  label: string
  description: string
  estimatedBytes: number
  estimatedFiles: number
  risk: CleanupRiskLevel
  available: boolean
  unavailableReason?: string
  /** Sample target paths shown for transparency (capped). */
  samplePaths: string[]
}

export interface CleanupScanResult {
  scannedAt: number
  platform: string
  categories: CleanupCategorySummary[]
  totalBytes: number
  totalFiles: number
  warnings: string[]
  durationMs: number
}

export interface CleanupExecuteOptions {
  /** Categories the user selected to clean. */
  categories: CleanupCategoryId[]
}

export interface CleanupStepResult {
  id: CleanupCategoryId
  label: string
  status: CleanupStepStatus
  bytesFreed: number
  filesRemoved: number
  detail?: string
  error?: string
}

export interface CleanupResult {
  success: boolean
  cancelled: boolean
  durationMs: number
  bytesFreed: number
  filesRemoved: number
  steps: CleanupStepResult[]
  warnings: string[]
}

export interface CleanupProgressEvent {
  phase: string
  categoryId?: CleanupCategoryId
  message: string
  percent: number
  currentItem?: string
  bytesFreedSoFar?: number
}

/** Smart Scan area identifiers — extensible for future modules */
export type SmartScanAreaId = 'cleanup' | 'storage' | 'performance' | 'security'

export type SmartScanAreaStatus = 'good' | 'warning' | 'issue'

export interface SmartScanAreaResult {
  id: SmartScanAreaId
  label: string
  description: string
  status: SmartScanAreaStatus
  /** Short user-facing finding, e.g. "1.2 GB reclaimable" */
  finding: string
  href: string
  reclaimableBytes?: number
  /** Approximate items inspected in this area */
  filesScanned?: number
  /** Optional secondary metric for summary cards */
  metricLabel?: string
  metricValue?: string
}

export interface SmartScanResult {
  scannedAt: number
  durationMs: number
  platform: string
  /** 0–100 composite health score */
  healthScore: number
  areas: SmartScanAreaResult[]
  totalReclaimableBytes: number
  duplicateBytes: number
  /** Heuristic potential boot-time improvement in seconds */
  estimatedBootSeconds: number
  areasNeedingAttention: number
  /** Approximate total items inspected across modules */
  filesScanned: number
  summaryTitle: string
  summaryMessage: string
  warnings: string[]
}

export interface SmartScanProgressEvent {
  phase: string
  areaId?: SmartScanAreaId
  message: string
  percent: number
  currentItem?: string
}

/** Options for uploading a local file to S3 via a server-issued presigned URL. */
export interface UploadFileOptions {
  filePath: string
  contentType?: string
  /** Optional object-key prefix segment (e.g. user id). */
  prefix?: string
  /** Optional bearer token for the API when auth is enabled. */
  authToken?: string
}

export interface UploadFileResult {
  key: string
  bucket: string
  contentType: string
  bytesUploaded: number
  etag?: string
}

/** Connectivity status for offline-aware UI and future sync. */
export type NetworkStatus = 'online' | 'offline' | 'unknown'

export interface NetworkStatusSnapshot {
  status: NetworkStatus
  online: boolean
  lastCheckedAt: number
  lastError: string | null
}

export interface OfflineDbHealth {
  ready: boolean
  path: string
  dirty: boolean
}

export interface SecureStorageInfo {
  encryptionAvailable: boolean
  mode: 'safeStorage' | 'aes-gcm'
}

export type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'

export interface ApiRequestConfig {
  method: ApiHttpMethod
  url: string
  params?: Record<string, string | number | boolean | undefined | null>
  data?: unknown
  headers?: Record<string, string>
  timeout?: number
  authToken?: string
  /** Skip attaching the persisted session access token. */
  skipAuth?: boolean
  /** Skip automatic token refresh + retry on HTTP 401. */
  skipAuthRefresh?: boolean
  /** Enable response caching for offline reads (GET/HEAD default). */
  cache?: boolean | { ttlMs?: number; namespace?: string; key?: string }
  retry?: boolean | { maxRetries?: number; delayMs?: number }
  skipOfflineCache?: boolean
  /** When true, never enqueue this mutating request while offline. */
  skipOfflineQueue?: boolean
  /** When true (default), unwrap `{ success, data }` server envelopes. */
  unwrapEnvelope?: boolean
}

export interface ApiClientResponse<T = unknown> {
  data: T
  status: number
  headers: Record<string, string>
  fromCache: boolean
  offline: boolean
  /** True when a mutating request was stored in the offline queue. */
  queued?: boolean
  queueRequestId?: string
}

export interface ApiResponseEnvelope<T = unknown> {
  success: boolean
  message?: string
  data?: T
  errors?: unknown
}

export interface ApiPublicError {
  code: string
  message: string
  status?: number
  retryable: boolean
}

export type OfflineQueueStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'abandoned'

export type OfflineQueueMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface OfflineQueueItem {
  id: string
  url: string
  method: OfflineQueueMethod
  headers: Record<string, string>
  body: unknown | null
  retryCount: number
  status: OfflineQueueStatus
  createdAt: string
  updatedAt: string
  lastError: string | null
  /** Hash of method+url+body for duplicate detection. */
  fingerprint: string | null
  /** Earliest time a failed item may be retried (ISO). */
  nextRetryAt: string | null
}

export interface OfflineQueueEnqueueInput {
  url: string
  method: OfflineQueueMethod
  headers?: Record<string, string>
  body?: unknown
  fingerprint?: string
}

export interface OfflineQueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  cancelled: number
  abandoned: number
  total: number
}

export type SyncPhase =
  | 'idle'
  | 'started'
  | 'item'
  | 'batch'
  | 'completed'
  | 'error'
  | 'cancelled'

export interface SyncProgressEvent {
  phase: SyncPhase
  total: number
  processed: number
  succeeded: number
  failed: number
  skipped: number
  conflicts: number
  currentRequestId?: string
  currentMethod?: string
  currentUrl?: string
  message: string
  percent: number
  running: boolean
}

export interface SyncRunResult {
  total: number
  succeeded: number
  failed: number
  skipped: number
  conflicts: number
  remaining: number
  cancelled: boolean
  durationMs: number
}

export type SyncConflictStrategy =
  | 'client_wins'
  | 'server_wins'
  | 'already_applied'
  | 'retry'
  | 'fail'

/** Cached user profile for offline auth. */
export interface AuthUserProfile {
  id: string
  email: string
  name: string
  trialUsed: boolean
}

export type SubscriptionPlanSlug = 'free' | 'pro' | 'premium'

export type CachedSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'past_due'
  | 'unknown'

/** Local subscription entitlement cache. */
export interface CachedSubscription {
  currentPlan: SubscriptionPlanSlug | string
  status: CachedSubscriptionStatus | string
  cancelAtPeriodEnd: boolean
  pendingPlan: string | null
  trialStart: string | null
  trialEnd: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  features: string[]
  isPaid: boolean
  hasActiveAccess: boolean
  /** Derived: currently in trial window. */
  isTrialing: boolean
  /** Plan / period expiry ISO (trialEnd or currentPeriodEnd). */
  expiresAt: string | null
  syncedAt: number
}

export interface AuthSessionSnapshot {
  authenticated: boolean
  offline: boolean
  user: AuthUserProfile | null
  subscription: CachedSubscription | null
  permissions: string[]
  accessExpiresAt: string | null
  refreshExpiresAt: string | null
  lastSyncedAt: number | null
}

export interface AuthCredentials {
  email: string
  password: string
  name?: string
}

export interface AuthSessionChangedEvent {
  session: AuthSessionSnapshot
  reason: string
}

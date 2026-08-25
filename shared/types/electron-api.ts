import type {
  OpenDialogOptions,
  SaveDialogOptions,
  MessageDialogOptions,
  DialogResult,
  SystemInfo,
  MemoryInfo,
  DriveInfo,
  StorageUsageResult,
  LargeFile,
  FindLargeFilesOptions,
  DuplicateGroup,
  FindDuplicatesOptions,
  DeleteFilesResult,
  BoostAnalysis,
  BoostOptions,
  BoostResult,
  BoostSnapshot,
  BoostProgressEvent,
  TerminateProcessesResult,
  BackgroundProcessesUpdate,
  StartupListResult,
  StartupAppEntry,
  StartupMutationResult,
  StartupSetEnabledOptions,
  SystemMetricsSample,
  CleanupScanResult,
  CleanupExecuteOptions,
  CleanupResult,
  CleanupProgressEvent,
  SmartScanResult,
  SmartScanProgressEvent,
  UploadFileOptions,
  UploadFileResult,
  NetworkStatusSnapshot,
  OfflineDbHealth,
  SecureStorageInfo,
  ApiRequestConfig,
  ApiClientResponse,
  SyncProgressEvent,
  SyncRunResult,
  OfflineQueueStats,
  OfflineQueueItem,
  AuthCredentials,
  AuthSessionSnapshot,
  AuthSessionChangedEvent,
  CachedSubscription,
  DeepLinkEvent
} from '@shared/interfaces'
import type { AppPath } from '@shared/types'

export interface AppApi {
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  quit: () => Promise<void>
  relaunch: () => Promise<void>
  getPath: (name: AppPath) => Promise<string>
  openExternal: (url: string) => Promise<{ opened: true }>
  onDeepLink: (callback: (event: DeepLinkEvent) => void) => () => void
  minimizeWindow: () => Promise<void>
  toggleMaximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isWindowMaximized: () => Promise<boolean>
  setWindowLayout: (layout: 'onboarding' | 'app') => Promise<{ layout: 'onboarding' | 'app' }>
  onWindowMaximizedChange: (callback: (maximized: boolean) => void) => () => void
}

export interface SystemApi {
  getInfo: () => Promise<SystemInfo>
  getMemory: () => Promise<MemoryInfo>
  getMetricsSample: () => Promise<SystemMetricsSample>
  startMetricsWatch: () => Promise<{ watching: boolean }>
  stopMetricsWatch: () => Promise<{ watching: boolean }>
  onMetricsUpdate: (callback: (sample: SystemMetricsSample) => void) => () => void
}

export interface FileApi {
  read: (filePath: string) => Promise<string>
  write: (filePath: string, content: string) => Promise<void>
  exists: (filePath: string) => Promise<boolean>
}

export interface DialogApi {
  open: (options?: OpenDialogOptions) => Promise<DialogResult>
  save: (options?: SaveDialogOptions) => Promise<DialogResult>
  message: (options: MessageDialogOptions) => Promise<{ response: number }>
  error: (title: string, content: string) => Promise<void>
}

export interface SettingsApi {
  get: <T>(key: string, defaultValue?: T) => Promise<T>
  set: (key: string, value: unknown) => Promise<void>
  getAll: () => Promise<Record<string, unknown>>
  reset: () => Promise<void>
}

export interface UpdaterApi {
  check: () => Promise<unknown>
  download: () => Promise<unknown>
  install: () => Promise<unknown>
  getStatus: () => Promise<unknown>
}

export interface StorageApi {
  getDrives: () => Promise<DriveInfo[]>
  analyzeUsage: (mountPath?: string) => Promise<StorageUsageResult>
  findLargeFiles: (options?: FindLargeFilesOptions) => Promise<LargeFile[]>
  findDuplicates: (options?: FindDuplicatesOptions) => Promise<DuplicateGroup[]>
  revealInFolder: (filePath: string) => Promise<void>
  deleteFiles: (filePaths: string[]) => Promise<DeleteFilesResult>
}

export interface BoostApi {
  analyze: () => Promise<BoostAnalysis>
  execute: (options?: BoostOptions) => Promise<BoostResult>
  cancel: () => Promise<{ cancelled: boolean }>
  getSnapshot: () => Promise<BoostSnapshot>
  terminateProcesses: (pids: number[]) => Promise<TerminateProcessesResult>
  listProcesses: () => Promise<BackgroundProcessesUpdate>
  startProcessWatch: () => Promise<{ watching: boolean }>
  stopProcessWatch: () => Promise<{ watching: boolean }>
  onProgress: (callback: (event: BoostProgressEvent) => void) => () => void
  onProcessesUpdate: (callback: (update: BackgroundProcessesUpdate) => void) => () => void
}

export interface StartupApi {
  list: (forceRefresh?: boolean) => Promise<StartupListResult>
  getDetails: (id: string) => Promise<StartupAppEntry | null>
  setEnabled: (options: StartupSetEnabledOptions) => Promise<StartupMutationResult>
}

export interface CleanupApi {
  scan: () => Promise<CleanupScanResult>
  execute: (options: CleanupExecuteOptions) => Promise<CleanupResult>
  cancel: () => Promise<{ cancelled: boolean }>
  onProgress: (callback: (event: CleanupProgressEvent) => void) => () => void
}

export interface SmartScanApi {
  run: () => Promise<SmartScanResult>
  cancel: () => Promise<{ cancelled: boolean }>
  onProgress: (callback: (event: SmartScanProgressEvent) => void) => () => void
}

export interface UploadApi {
  file: (options: UploadFileOptions) => Promise<UploadFileResult>
}

export interface OfflineApi {
  getDbHealth: () => Promise<OfflineDbHealth>
  getNetworkStatus: () => Promise<NetworkStatusSnapshot>
  checkNetwork: () => Promise<NetworkStatusSnapshot>
  watchNetwork: () => Promise<{ watching: boolean }>
  unwatchNetwork: () => Promise<{ watching: boolean }>
  onNetworkStatusChanged: (
    callback: (snapshot: NetworkStatusSnapshot) => void
  ) => () => void
  storage: {
    get: <T>(key: string, defaultValue?: T, namespace?: string) => Promise<T | undefined>
    set: (key: string, value: unknown, namespace?: string) => Promise<void>
    delete: (key: string, namespace?: string) => Promise<boolean>
    keys: (namespace?: string) => Promise<string[]>
    clear: (namespace?: string) => Promise<number>
  }
  secure: {
    info: () => Promise<SecureStorageInfo>
  }
  cache: {
    get: <T>(key: string, namespace?: string) => Promise<T | null>
    set: (
      key: string,
      value: unknown,
      options?: { ttlMs?: number; namespace?: string }
    ) => Promise<void>
    delete: (key: string, namespace?: string) => Promise<boolean>
    has: (key: string, namespace?: string) => Promise<boolean>
    clear: (namespace?: string) => Promise<number>
  }
}

export interface ApiBridge {
  request: <T = unknown>(config: ApiRequestConfig) => Promise<ApiClientResponse<T>>
  get: <T = unknown>(
    url: string,
    config?: Omit<ApiRequestConfig, 'method' | 'url'>
  ) => Promise<ApiClientResponse<T>>
  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>
  ) => Promise<ApiClientResponse<T>>
  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>
  ) => Promise<ApiClientResponse<T>>
  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>
  ) => Promise<ApiClientResponse<T>>
  delete: <T = unknown>(
    url: string,
    config?: Omit<ApiRequestConfig, 'method' | 'url'>
  ) => Promise<ApiClientResponse<T>>
}

export interface SyncApi {
  start: (reason?: string) => Promise<SyncRunResult>
  cancel: () => Promise<{ cancelled: boolean }>
  getStatus: () => Promise<{
    running: boolean
    lastProgress: SyncProgressEvent | null
    queue: OfflineQueueStats
  }>
  getQueueStats: () => Promise<OfflineQueueStats>
  listQueue: (limit?: number) => Promise<OfflineQueueItem[]>
  onProgress: (callback: (event: SyncProgressEvent) => void) => () => void
}

export interface AuthApi {
  login: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  register: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  requestLoginOtp: (email: string) => Promise<{ requiresOtp: true }>
  verifyLoginOtp: (email: string, code: string) => Promise<AuthSessionSnapshot>
  setPassword: (password: string) => Promise<AuthSessionSnapshot>
  logout: () => Promise<AuthSessionSnapshot>
  getSession: () => Promise<AuthSessionSnapshot>
  sync: (reason?: string) => Promise<AuthSessionSnapshot>
  refresh: () => Promise<{ refreshed: boolean; session: AuthSessionSnapshot }>
  hasPermission: (permission: string) => Promise<boolean>
  getSubscription: () => Promise<{
    subscription: CachedSubscription | null
    plan: string
    expiry: string | null
    features: string[]
    trial: { isTrialing: boolean; trialEnd: string | null }
  }>
  openWindow: (mode?: 'login' | 'register') => Promise<{
    opened: true
    mode: 'login' | 'register'
  }>
  onSessionChanged: (callback: (event: AuthSessionChangedEvent) => void) => () => void
}

export interface ElectronApi {
  app: AppApi
  system: SystemApi
  file: FileApi
  dialog: DialogApi
  settings: SettingsApi
  updater: UpdaterApi
  storage: StorageApi
  boost: BoostApi
  startup: StartupApi
  cleanup: CleanupApi
  smartScan: SmartScanApi
  upload: UploadApi
  offline: OfflineApi
  api: ApiBridge
  sync: SyncApi
  auth: AuthApi
}

declare global {
  interface Window {
    electron: ElectronApi
  }
}

export {}

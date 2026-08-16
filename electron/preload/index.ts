import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { IpcResponse } from '@shared/interfaces'
import type {
  OpenDialogOptions,
  SaveDialogOptions,
  MessageDialogOptions,
  DialogResult,
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
  StartupListResult,
  StartupAppEntry,
  StartupMutationResult,
  StartupSetEnabledOptions,
  TerminateProcessesResult,
  BackgroundProcessesUpdate,
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

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const response = (await ipcRenderer.invoke(channel, ...args)) as IpcResponse<T>
  if (!response.success) {
    throw new Error(response.error ?? 'IPC call failed')
  }
  return response.data as T
}

const appApi = {
  getVersion: () => invoke<string>(IPC_CHANNELS.APP.GET_VERSION),
  getPlatform: () => invoke<string>(IPC_CHANNELS.APP.GET_PLATFORM),
  quit: () => invoke<void>(IPC_CHANNELS.APP.QUIT),
  relaunch: () => invoke<void>(IPC_CHANNELS.APP.RELAUNCH),
  getPath: (name: AppPath) => invoke<string>(IPC_CHANNELS.APP.GET_PATH, name),
  openExternal: (url: string) =>
    invoke<{ opened: true }>(IPC_CHANNELS.APP.OPEN_EXTERNAL, url),
  onDeepLink: (callback: (event: DeepLinkEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: DeepLinkEvent): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.APP.DEEP_LINK, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.APP.DEEP_LINK, listener)
    }
  },
  minimizeWindow: () => invoke<void>(IPC_CHANNELS.APP.WINDOW_MINIMIZE),
  toggleMaximizeWindow: () => invoke<void>(IPC_CHANNELS.APP.WINDOW_TOGGLE_MAXIMIZE),
  closeWindow: () => invoke<void>(IPC_CHANNELS.APP.WINDOW_CLOSE),
  isWindowMaximized: () => invoke<boolean>(IPC_CHANNELS.APP.WINDOW_IS_MAXIMIZED),
  onWindowMaximizedChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: unknown): void => {
      callback(maximized === true)
    }
    ipcRenderer.on(IPC_CHANNELS.APP.WINDOW_MAXIMIZED_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.APP.WINDOW_MAXIMIZED_CHANGED, listener)
    }
  }
}

const systemApi = {
  getInfo: () => invoke(IPC_CHANNELS.SYSTEM.GET_INFO),
  getMemory: () => invoke(IPC_CHANNELS.SYSTEM.GET_MEMORY),
  getMetricsSample: () =>
    invoke<SystemMetricsSample>(IPC_CHANNELS.SYSTEM.GET_METRICS_SAMPLE),
  startMetricsWatch: () =>
    invoke<{ watching: boolean }>(IPC_CHANNELS.SYSTEM.START_METRICS_WATCH),
  stopMetricsWatch: () =>
    invoke<{ watching: boolean }>(IPC_CHANNELS.SYSTEM.STOP_METRICS_WATCH),
  onMetricsUpdate: (callback: (sample: SystemMetricsSample) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: SystemMetricsSample): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.SYSTEM.METRICS_UPDATE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SYSTEM.METRICS_UPDATE, listener)
    }
  }
}

const fileApi = {
  read: (filePath: string) => invoke<string>(IPC_CHANNELS.FILE.READ, filePath),
  write: (filePath: string, content: string) =>
    invoke<void>(IPC_CHANNELS.FILE.WRITE, filePath, content),
  exists: (filePath: string) => invoke<boolean>(IPC_CHANNELS.FILE.EXISTS, filePath)
}

const dialogApi = {
  open: (options?: OpenDialogOptions) =>
    invoke<DialogResult>(IPC_CHANNELS.DIALOG.OPEN, options),
  save: (options?: SaveDialogOptions) =>
    invoke<DialogResult>(IPC_CHANNELS.DIALOG.SAVE, options),
  message: (options: MessageDialogOptions) =>
    invoke<{ response: number }>(IPC_CHANNELS.DIALOG.MESSAGE, options),
  error: (title: string, content: string) =>
    invoke<void>(IPC_CHANNELS.DIALOG.ERROR, title, content)
}

const settingsApi = {
  get: <T>(key: string, defaultValue?: T) =>
    invoke<T>(IPC_CHANNELS.SETTINGS.GET, key, defaultValue),
  set: (key: string, value: unknown) => invoke<void>(IPC_CHANNELS.SETTINGS.SET, key, value),
  getAll: () => invoke<Record<string, unknown>>(IPC_CHANNELS.SETTINGS.GET_ALL),
  reset: () => invoke<void>(IPC_CHANNELS.SETTINGS.RESET)
}

const updaterApi = {
  check: () => invoke(IPC_CHANNELS.UPDATER.CHECK),
  download: () => invoke(IPC_CHANNELS.UPDATER.DOWNLOAD),
  install: () => invoke(IPC_CHANNELS.UPDATER.INSTALL),
  getStatus: () => invoke(IPC_CHANNELS.UPDATER.GET_STATUS)
}

const storageApi = {
  getDrives: () => invoke<DriveInfo[]>(IPC_CHANNELS.STORAGE.GET_DRIVES),
  analyzeUsage: (mountPath?: string) =>
    invoke<StorageUsageResult>(IPC_CHANNELS.STORAGE.ANALYZE_USAGE, mountPath),
  findLargeFiles: (options?: FindLargeFilesOptions) =>
    invoke<LargeFile[]>(IPC_CHANNELS.STORAGE.FIND_LARGE_FILES, options),
  findDuplicates: (options?: FindDuplicatesOptions) =>
    invoke<DuplicateGroup[]>(IPC_CHANNELS.STORAGE.FIND_DUPLICATES, options),
  revealInFolder: (filePath: string) =>
    invoke<void>(IPC_CHANNELS.STORAGE.REVEAL_IN_FOLDER, filePath),
  deleteFiles: (filePaths: string[]) =>
    invoke<DeleteFilesResult>(IPC_CHANNELS.STORAGE.DELETE_FILES, filePaths)
}

const boostApi = {
  analyze: () => invoke<BoostAnalysis>(IPC_CHANNELS.BOOST.ANALYZE),
  execute: (options?: BoostOptions) =>
    invoke<BoostResult>(IPC_CHANNELS.BOOST.EXECUTE, options),
  cancel: () => invoke<{ cancelled: boolean }>(IPC_CHANNELS.BOOST.CANCEL),
  getSnapshot: () => invoke<BoostSnapshot>(IPC_CHANNELS.BOOST.GET_SNAPSHOT),
  terminateProcesses: (pids: number[]) =>
    invoke<TerminateProcessesResult>(IPC_CHANNELS.BOOST.TERMINATE_PROCESSES, pids),
  listProcesses: () =>
    invoke<BackgroundProcessesUpdate>(IPC_CHANNELS.BOOST.LIST_PROCESSES),
  startProcessWatch: () =>
    invoke<{ watching: boolean }>(IPC_CHANNELS.BOOST.START_PROCESS_WATCH),
  stopProcessWatch: () =>
    invoke<{ watching: boolean }>(IPC_CHANNELS.BOOST.STOP_PROCESS_WATCH),
  onProgress: (callback: (event: BoostProgressEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: BoostProgressEvent): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.BOOST.PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BOOST.PROGRESS, listener)
    }
  },
  onProcessesUpdate: (callback: (update: BackgroundProcessesUpdate) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: BackgroundProcessesUpdate
    ): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.BOOST.PROCESSES_UPDATE, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.BOOST.PROCESSES_UPDATE, listener)
    }
  }
}

const startupApi = {
  list: (forceRefresh?: boolean) =>
    invoke<StartupListResult>(IPC_CHANNELS.STARTUP.LIST, forceRefresh === true),
  getDetails: (id: string) =>
    invoke<StartupAppEntry | null>(IPC_CHANNELS.STARTUP.GET_DETAILS, id),
  setEnabled: (options: StartupSetEnabledOptions) =>
    invoke<StartupMutationResult>(IPC_CHANNELS.STARTUP.SET_ENABLED, options)
}

const cleanupApi = {
  scan: () => invoke<CleanupScanResult>(IPC_CHANNELS.CLEANUP.SCAN),
  execute: (options: CleanupExecuteOptions) =>
    invoke<CleanupResult>(IPC_CHANNELS.CLEANUP.EXECUTE, options),
  cancel: () => invoke<{ cancelled: boolean }>(IPC_CHANNELS.CLEANUP.CANCEL),
  onProgress: (callback: (event: CleanupProgressEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: CleanupProgressEvent): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.CLEANUP.PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CLEANUP.PROGRESS, listener)
    }
  }
}

const smartScanApi = {
  run: () => invoke<SmartScanResult>(IPC_CHANNELS.SMART_SCAN.RUN),
  cancel: () => invoke<{ cancelled: boolean }>(IPC_CHANNELS.SMART_SCAN.CANCEL),
  onProgress: (callback: (event: SmartScanProgressEvent) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: SmartScanProgressEvent
    ): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.SMART_SCAN.PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SMART_SCAN.PROGRESS, listener)
    }
  }
}

const uploadApi = {
  file: (options: UploadFileOptions) =>
    invoke<UploadFileResult>(IPC_CHANNELS.UPLOAD.FILE, options)
}

const offlineApi = {
  getDbHealth: () => invoke<OfflineDbHealth>(IPC_CHANNELS.OFFLINE.DB_HEALTH),
  getNetworkStatus: () =>
    invoke<NetworkStatusSnapshot>(IPC_CHANNELS.OFFLINE.GET_NETWORK_STATUS),
  checkNetwork: () =>
    invoke<NetworkStatusSnapshot>(IPC_CHANNELS.OFFLINE.CHECK_NETWORK),
  watchNetwork: () =>
    invoke<{ watching: boolean }>(IPC_CHANNELS.OFFLINE.WATCH_NETWORK),
  unwatchNetwork: () =>
    invoke<{ watching: boolean }>(IPC_CHANNELS.OFFLINE.UNWATCH_NETWORK),
  onNetworkStatusChanged: (callback: (snapshot: NetworkStatusSnapshot) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: NetworkStatusSnapshot
    ): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.OFFLINE.NETWORK_STATUS_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.OFFLINE.NETWORK_STATUS_CHANGED, listener)
    }
  },
  storage: {
    get: <T>(key: string, defaultValue?: T, namespace?: string) =>
      invoke<T | undefined>(
        IPC_CHANNELS.OFFLINE.STORAGE_GET,
        key,
        defaultValue,
        namespace
      ),
    set: (key: string, value: unknown, namespace?: string) =>
      invoke<void>(IPC_CHANNELS.OFFLINE.STORAGE_SET, key, value, namespace),
    delete: (key: string, namespace?: string) =>
      invoke<boolean>(IPC_CHANNELS.OFFLINE.STORAGE_DELETE, key, namespace),
    keys: (namespace?: string) =>
      invoke<string[]>(IPC_CHANNELS.OFFLINE.STORAGE_KEYS, namespace),
    clear: (namespace?: string) =>
      invoke<number>(IPC_CHANNELS.OFFLINE.STORAGE_CLEAR, namespace)
  },
  secure: {
    info: () => invoke<SecureStorageInfo>(IPC_CHANNELS.OFFLINE.SECURE_INFO)
  },
  cache: {
    get: <T>(key: string, namespace?: string) =>
      invoke<T | null>(IPC_CHANNELS.OFFLINE.CACHE_GET, key, namespace),
    set: (
      key: string,
      value: unknown,
      options?: { ttlMs?: number; namespace?: string }
    ) => invoke<void>(IPC_CHANNELS.OFFLINE.CACHE_SET, key, value, options),
    delete: (key: string, namespace?: string) =>
      invoke<boolean>(IPC_CHANNELS.OFFLINE.CACHE_DELETE, key, namespace),
    has: (key: string, namespace?: string) =>
      invoke<boolean>(IPC_CHANNELS.OFFLINE.CACHE_HAS, key, namespace),
    clear: (namespace?: string) =>
      invoke<number>(IPC_CHANNELS.OFFLINE.CACHE_CLEAR, namespace)
  }
}

const apiBridge = {
  request: <T>(config: ApiRequestConfig) =>
    invoke<ApiClientResponse<T>>(IPC_CHANNELS.API.REQUEST, config),
  get: <T>(url: string, config?: Omit<ApiRequestConfig, 'method' | 'url'>) =>
    invoke<ApiClientResponse<T>>(IPC_CHANNELS.API.REQUEST, {
      method: 'GET',
      url,
      ...config
    }),
  post: <T>(
    url: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>
  ) =>
    invoke<ApiClientResponse<T>>(IPC_CHANNELS.API.REQUEST, {
      method: 'POST',
      url,
      data,
      ...config
    }),
  put: <T>(
    url: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>
  ) =>
    invoke<ApiClientResponse<T>>(IPC_CHANNELS.API.REQUEST, {
      method: 'PUT',
      url,
      data,
      ...config
    }),
  patch: <T>(
    url: string,
    data?: unknown,
    config?: Omit<ApiRequestConfig, 'method' | 'url' | 'data'>
  ) =>
    invoke<ApiClientResponse<T>>(IPC_CHANNELS.API.REQUEST, {
      method: 'PATCH',
      url,
      data,
      ...config
    }),
  delete: <T>(url: string, config?: Omit<ApiRequestConfig, 'method' | 'url'>) =>
    invoke<ApiClientResponse<T>>(IPC_CHANNELS.API.REQUEST, {
      method: 'DELETE',
      url,
      ...config
    })
}

const syncApi = {
  start: (reason?: string) =>
    invoke<SyncRunResult>(IPC_CHANNELS.SYNC.START, reason),
  cancel: () => invoke<{ cancelled: boolean }>(IPC_CHANNELS.SYNC.CANCEL),
  getStatus: () =>
    invoke<{
      running: boolean
      lastProgress: SyncProgressEvent | null
      queue: OfflineQueueStats
    }>(IPC_CHANNELS.SYNC.STATUS),
  getQueueStats: () =>
    invoke<OfflineQueueStats>(IPC_CHANNELS.SYNC.QUEUE_STATS),
  listQueue: (limit?: number) =>
    invoke<OfflineQueueItem[]>(IPC_CHANNELS.SYNC.QUEUE_LIST, limit),
  onProgress: (callback: (event: SyncProgressEvent) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: SyncProgressEvent
    ): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.SYNC.PROGRESS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.SYNC.PROGRESS, listener)
    }
  }
}

const authApi = {
  login: (credentials: AuthCredentials) =>
    invoke<AuthSessionSnapshot>(IPC_CHANNELS.AUTH.LOGIN, credentials),
  register: (credentials: AuthCredentials) =>
    invoke<AuthSessionSnapshot>(IPC_CHANNELS.AUTH.REGISTER, credentials),
  logout: () => invoke<AuthSessionSnapshot>(IPC_CHANNELS.AUTH.LOGOUT),
  getSession: () =>
    invoke<AuthSessionSnapshot>(IPC_CHANNELS.AUTH.GET_SESSION),
  sync: (reason?: string) =>
    invoke<AuthSessionSnapshot>(IPC_CHANNELS.AUTH.SYNC, reason),
  refresh: () =>
    invoke<{ refreshed: boolean; session: AuthSessionSnapshot }>(
      IPC_CHANNELS.AUTH.REFRESH
    ),
  hasPermission: (permission: string) =>
    invoke<boolean>(IPC_CHANNELS.AUTH.HAS_PERMISSION, permission),
  getSubscription: () =>
    invoke<{
      subscription: CachedSubscription | null
      plan: string
      expiry: string | null
      features: string[]
      trial: { isTrialing: boolean; trialEnd: string | null }
    }>(IPC_CHANNELS.AUTH.GET_SUBSCRIPTION),
  onSessionChanged: (callback: (event: AuthSessionChangedEvent) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: AuthSessionChangedEvent
    ): void => {
      callback(data)
    }
    ipcRenderer.on(IPC_CHANNELS.AUTH.SESSION_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUTH.SESSION_CHANGED, listener)
    }
  }
}

const electronApi = {
  app: appApi,
  system: systemApi,
  file: fileApi,
  dialog: dialogApi,
  settings: settingsApi,
  updater: updaterApi,
  storage: storageApi,
  boost: boostApi,
  startup: startupApi,
  cleanup: cleanupApi,
  smartScan: smartScanApi,
  upload: uploadApi,
  offline: offlineApi,
  api: apiBridge,
  sync: syncApi,
  auth: authApi
}

contextBridge.exposeInMainWorld('electron', electronApi)

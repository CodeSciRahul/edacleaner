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
  UploadFileResult
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
  getPath: (name: AppPath) => invoke<string>(IPC_CHANNELS.APP.GET_PATH, name)
}

const windowApi = {
  minimize: () => invoke<void>(IPC_CHANNELS.WINDOW.MINIMIZE),
  maximize: () => invoke<boolean>(IPC_CHANNELS.WINDOW.MAXIMIZE),
  close: () => invoke<void>(IPC_CHANNELS.WINDOW.CLOSE),
  isMaximized: () => invoke<boolean>(IPC_CHANNELS.WINDOW.IS_MAXIMIZED),
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean): void => {
      callback(maximized)
    }
    ipcRenderer.on(IPC_CHANNELS.WINDOW.MAXIMIZED_CHANGED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.WINDOW.MAXIMIZED_CHANGED, listener)
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

const electronApi = {
  app: appApi,
  window: windowApi,
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
  upload: uploadApi
}

contextBridge.exposeInMainWorld('electron', electronApi)

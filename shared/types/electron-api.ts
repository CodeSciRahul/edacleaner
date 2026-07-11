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
  StartupSetEnabledOptions
} from '@shared/interfaces'
import type { AppPath } from '@shared/types'

export interface AppApi {
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  quit: () => Promise<void>
  relaunch: () => Promise<void>
  getPath: (name: AppPath) => Promise<string>
}

export interface SystemApi {
  getInfo: () => Promise<SystemInfo>
  getMemory: () => Promise<MemoryInfo>
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
}

declare global {
  interface Window {
    electron: ElectronApi
  }
}

export {}

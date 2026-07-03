import type {
  OpenDialogOptions,
  SaveDialogOptions,
  MessageDialogOptions,
  DialogResult,
  SystemInfo,
  MemoryInfo
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

export interface ElectronApi {
  app: AppApi
  system: SystemApi
  file: FileApi
  dialog: DialogApi
  settings: SettingsApi
  updater: UpdaterApi
}

declare global {
  interface Window {
    electron: ElectronApi
  }
}

export {}

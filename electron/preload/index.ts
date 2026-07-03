import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/constants'
import type { IpcResponse } from '@shared/interfaces'
import type {
  OpenDialogOptions,
  SaveDialogOptions,
  MessageDialogOptions,
  DialogResult
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

const systemApi = {
  getInfo: () => invoke(IPC_CHANNELS.SYSTEM.GET_INFO),
  getMemory: () => invoke(IPC_CHANNELS.SYSTEM.GET_MEMORY)
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

const electronApi = {
  app: appApi,
  system: systemApi,
  file: fileApi,
  dialog: dialogApi,
  settings: settingsApi,
  updater: updaterApi
}

contextBridge.exposeInMainWorld('electron', electronApi)

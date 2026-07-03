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

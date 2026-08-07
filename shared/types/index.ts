import type { Platform, Environment } from '@shared/enums'

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type AppPath =
  | 'home'
  | 'appData'
  | 'userData'
  | 'temp'
  | 'exe'
  | 'desktop'
  | 'documents'
  | 'downloads'

export interface FeatureFlags {
  enableAutoUpdate: boolean
  enableAnalytics: boolean
  enableDevTools: boolean
  enableExperimentalFeatures: boolean
}

export interface AppConfig {
  name: string
  version: string
  environment: Environment
  platform: Platform
  isPackaged: boolean
  featureFlags: FeatureFlags
}

export type SettingsSchema = Record<string, unknown>

export type {
  ElectronApi,
  AppApi,
  SystemApi,
  FileApi,
  DialogApi,
  SettingsApi,
  UpdaterApi,
  UploadApi,
  OfflineApi,
  ApiBridge,
  SyncApi
} from './electron-api'

export enum Platform {
  Windows = 'win32',
  macOS = 'darwin',
  Linux = 'linux',
  Unknown = 'unknown'
}

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test'
}

export enum UpdateStatus {
  Idle = 'idle',
  Checking = 'checking',
  Available = 'available',
  Downloading = 'downloading',
  Downloaded = 'downloaded',
  Installing = 'installing',
  Error = 'error',
  UpToDate = 'up-to-date'
}

export enum DialogType {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Question = 'question'
}

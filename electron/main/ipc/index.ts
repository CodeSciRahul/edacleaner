import {
  BrowserWindow,
  ipcMain,
  dialog,
  type OpenDialogOptions,
  type SaveDialogOptions
} from 'electron'
import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'
import { IPC_CHANNELS } from '@shared/constants'
import type { IpcResponse } from '@shared/interfaces'
import {
  appService,
  boostService,
  cleanupService,
  settingsService,
  smartScanService,
  startupService,
  storageService,
  systemService,
  updaterService,
  uploadService
} from '@main/services'
import type {
  BoostOptions,
  CleanupCategoryId,
  CleanupExecuteOptions
} from '@shared/interfaces'

function success<T>(data: T): IpcResponse<T> {
  return { success: true, data }
}

function failure(error: string): IpcResponse {
  return { success: false, error }
}

export function registerAppIpc(): void {
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, () => success(appService.getVersion()))
  ipcMain.handle(IPC_CHANNELS.APP.GET_PLATFORM, () => success(appService.getPlatform()))
  ipcMain.handle(IPC_CHANNELS.APP.QUIT, () => {
    appService.quit()
    return success(null)
  })
  ipcMain.handle(IPC_CHANNELS.APP.RELAUNCH, () => {
    appService.relaunch()
    return success(null)
  })
  ipcMain.handle(IPC_CHANNELS.APP.GET_PATH, (_event, name: string) =>
    success(appService.getPath(name as Parameters<typeof appService.getPath>[0]))
  )
}

function getWindowFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

function bindMaximizedEvents(window: BrowserWindow): void {
  const send = (): void => {
    if (window.isDestroyed() || window.webContents.isDestroyed()) return
    window.webContents.send(IPC_CHANNELS.WINDOW.MAXIMIZED_CHANGED, window.isMaximized())
  }
  window.on('maximize', send)
  window.on('unmaximize', send)
  window.on('enter-full-screen', send)
  window.on('leave-full-screen', send)
}

const maximizedBoundWindows = new WeakSet<BrowserWindow>()

export function registerWindowIpc(): void {
  ipcMain.handle(IPC_CHANNELS.WINDOW.MINIMIZE, (event) => {
    const window = getWindowFromEvent(event)
    window?.minimize()
    return success(null)
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW.MAXIMIZE, (event) => {
    const window = getWindowFromEvent(event)
    if (!window) return success(null)
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
    return success(window.isMaximized())
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW.CLOSE, (event) => {
    const window = getWindowFromEvent(event)
    window?.close()
    return success(null)
  })

  ipcMain.handle(IPC_CHANNELS.WINDOW.IS_MAXIMIZED, (event) => {
    const window = getWindowFromEvent(event)
    if (window && !maximizedBoundWindows.has(window)) {
      bindMaximizedEvents(window)
      maximizedBoundWindows.add(window)
    }
    return success(window?.isMaximized() ?? false)
  })
}

export function registerSystemIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_INFO, () => success(systemService.getInfo()))
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_MEMORY, () => success(systemService.getMemory()))

  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_METRICS_SAMPLE, () => {
    try {
      return success(systemService.getMetricsSample())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to sample metrics')
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.START_METRICS_WATCH, (event) => {
    try {
      return success(systemService.startMetricsWatch(event.sender))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to start metrics watch')
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM.STOP_METRICS_WATCH, (event) => {
    try {
      return success(systemService.stopMetricsWatch(event.sender))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to stop metrics watch')
    }
  })
}

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, (_event, key: string, defaultValue?: unknown) =>
    success(settingsService.get(key, defaultValue))
  )
  ipcMain.handle(IPC_CHANNELS.SETTINGS.SET, (_event, key: string, value: unknown) => {
    settingsService.set(key, value)
    return success(null)
  })
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET_ALL, () => success(settingsService.getAll()))
  ipcMain.handle(IPC_CHANNELS.SETTINGS.RESET, () => {
    settingsService.reset()
    return success(null)
  })
}

export function registerUpdaterIpc(): void {
  ipcMain.handle(IPC_CHANNELS.UPDATER.CHECK, () => success(updaterService.checkForUpdates()))
  ipcMain.handle(IPC_CHANNELS.UPDATER.GET_STATUS, () => success(updaterService.getStatus()))
  ipcMain.handle(IPC_CHANNELS.UPDATER.DOWNLOAD, () =>
    success({ message: 'Download handler ready for integration' })
  )
  ipcMain.handle(IPC_CHANNELS.UPDATER.INSTALL, () =>
    success({ message: 'Install handler ready for integration' })
  )
}

export function registerDialogIpc(): void {
  ipcMain.handle(IPC_CHANNELS.DIALOG.OPEN, async (_event, options: OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options)
    return success({
      canceled: result.canceled,
      filePaths: result.filePaths
    })
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG.SAVE, async (_event, options: SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(options)
    return success({
      canceled: result.canceled,
      filePath: result.filePath
    })
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG.MESSAGE, async (_event, options) => {
    const result = await dialog.showMessageBox(options)
    return success({ response: result.response })
  })

  ipcMain.handle(IPC_CHANNELS.DIALOG.ERROR, async (_event, title: string, content: string) => {
    await dialog.showErrorBox(title, content)
    return success(null)
  })
}

export function registerFileIpc(): void {
  ipcMain.handle(IPC_CHANNELS.FILE.READ, async (_event, filePath: string) => {
    try {
      const content = await readFile(filePath, 'utf-8')
      return success(content)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to read file')
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILE.WRITE, async (_event, filePath: string, content: string) => {
    try {
      await writeFile(filePath, content, 'utf-8')
      return success(null)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to write file')
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILE.EXISTS, async (_event, filePath: string) => {
    try {
      await access(filePath, constants.F_OK)
      return success(true)
    } catch {
      return success(false)
    }
  })
}

export function registerStorageIpc(): void {
  ipcMain.handle(IPC_CHANNELS.STORAGE.GET_DRIVES, async () => {
    try {
      return success(await storageService.getDrives())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to get drives')
    }
  })

  ipcMain.handle(IPC_CHANNELS.STORAGE.ANALYZE_USAGE, async (_event, mountPath?: string) => {
    try {
      return success(await storageService.analyzeUsage(mountPath))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to analyze disk usage')
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.STORAGE.FIND_LARGE_FILES,
    async (_event, options?: Parameters<typeof storageService.findLargeFiles>[0]) => {
      try {
        return success(await storageService.findLargeFiles(options))
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Failed to find large files')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.STORAGE.FIND_DUPLICATES,
    async (_event, options?: Parameters<typeof storageService.findDuplicates>[0]) => {
      try {
        return success(await storageService.findDuplicates(options))
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Failed to find duplicates')
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.STORAGE.REVEAL_IN_FOLDER, async (_event, filePath: string) => {
    try {
      await storageService.revealInFolder(filePath)
      return success(null)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to reveal item')
    }
  })

  ipcMain.handle(IPC_CHANNELS.STORAGE.DELETE_FILES, async (_event, filePaths: string[]) => {
    try {
      return success(await storageService.deleteFiles(filePaths))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to delete files')
    }
  })
}

function validateBoostOptions(input: unknown): BoostOptions {
  if (input == null) return {}
  if (typeof input !== 'object') {
    throw new Error('Invalid Boost options')
  }

  const raw = input as Record<string, unknown>
  const terminateProcessIds = Array.isArray(raw.terminateProcessIds)
    ? raw.terminateProcessIds.filter((id): id is number => typeof id === 'number' && id > 0)
    : undefined

  return {
    cleanTempFiles: typeof raw.cleanTempFiles === 'boolean' ? raw.cleanTempFiles : undefined,
    cleanAppCaches: typeof raw.cleanAppCaches === 'boolean' ? raw.cleanAppCaches : undefined,
    emptyTrash: typeof raw.emptyTrash === 'boolean' ? raw.emptyTrash : undefined,
    flushDnsCache: typeof raw.flushDnsCache === 'boolean' ? raw.flushDnsCache : undefined,
    terminateProcessIds
  }
}

export function registerBoostIpc(): void {
  ipcMain.handle(IPC_CHANNELS.BOOST.ANALYZE, async () => {
    try {
      return success(await boostService.analyze())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to analyze system')
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOST.GET_SNAPSHOT, async () => {
    try {
      return success(await boostService.getSnapshot())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to get system snapshot')
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOST.CANCEL, () => {
    try {
      return success(boostService.cancel())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to cancel Boost')
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOST.TERMINATE_PROCESSES, async (_event, rawPids?: unknown) => {
    try {
      if (!Array.isArray(rawPids)) {
        return failure('Process IDs must be an array')
      }
      const pids = rawPids.filter((pid): pid is number => typeof pid === 'number' && pid > 0)
      if (pids.length === 0) {
        return failure('No valid process IDs provided')
      }
      if (pids.length > 20) {
        return failure('Too many processes requested at once (max 20)')
      }
      return success(await boostService.terminateProcesses(pids))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to stop processes')
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOST.LIST_PROCESSES, async () => {
    try {
      return success(await boostService.listBackgroundProcesses())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to list processes')
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOST.START_PROCESS_WATCH, (event) => {
    try {
      return success(boostService.startProcessWatch(event.sender))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to start process watch')
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOST.STOP_PROCESS_WATCH, (event) => {
    try {
      return success(boostService.stopProcessWatch(event.sender))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to stop process watch')
    }
  })

  ipcMain.handle(IPC_CHANNELS.BOOST.EXECUTE, async (event, rawOptions?: unknown) => {
    try {
      if (boostService.isRunning()) {
        return failure('A Boost operation is already running')
      }

      const options = validateBoostOptions(rawOptions)
      const result = await boostService.execute(options, (progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC_CHANNELS.BOOST.PROGRESS, progress)
        }
      })
      return success(result)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Boost failed')
    }
  })
}

function validateStartupSetEnabled(input: unknown): { id: string; enabled: boolean } {
  if (input == null || typeof input !== 'object') {
    throw new Error('Invalid startup options')
  }
  const raw = input as Record<string, unknown>
  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    throw new Error('Invalid startup entry id')
  }
  if (typeof raw.enabled !== 'boolean') {
    throw new Error('Invalid enabled flag')
  }
  return { id: raw.id, enabled: raw.enabled }
}

export function registerStartupIpc(): void {
  ipcMain.handle(IPC_CHANNELS.STARTUP.LIST, async (_event, forceRefresh?: unknown) => {
    try {
      const force = forceRefresh === true
      return success(await startupService.list({ forceRefresh: force }))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to list startup apps')
    }
  })

  ipcMain.handle(IPC_CHANNELS.STARTUP.GET_DETAILS, async (_event, id?: unknown) => {
    try {
      if (typeof id !== 'string' || !id.trim()) {
        return failure('Invalid startup entry id')
      }
      return success(await startupService.getDetails(id))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to get startup details')
    }
  })

  ipcMain.handle(IPC_CHANNELS.STARTUP.SET_ENABLED, async (_event, rawOptions?: unknown) => {
    try {
      const options = validateStartupSetEnabled(rawOptions)
      return success(await startupService.setEnabled(options))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to update startup app')
    }
  })
}

const VALID_CLEANUP_CATEGORIES = new Set<CleanupCategoryId>([
  'junk',
  'temp',
  'recycle',
  'browser',
  'system'
])

function validateCleanupOptions(input: unknown): CleanupExecuteOptions {
  if (input == null || typeof input !== 'object') {
    throw new Error('Invalid cleanup options')
  }
  const raw = input as Record<string, unknown>
  if (!Array.isArray(raw.categories)) {
    throw new Error('Cleanup categories must be an array')
  }
  const categories = raw.categories.filter(
    (id): id is CleanupCategoryId =>
      typeof id === 'string' && VALID_CLEANUP_CATEGORIES.has(id as CleanupCategoryId)
  )
  if (categories.length === 0) {
    throw new Error('Select at least one valid cleanup category')
  }
  if (categories.length > 10) {
    throw new Error('Too many cleanup categories requested')
  }
  return { categories }
}

export function registerCleanupIpc(): void {
  ipcMain.handle(IPC_CHANNELS.CLEANUP.SCAN, async (event) => {
    try {
      if (cleanupService.isRunning()) {
        return failure('A cleanup operation is already running')
      }
      const result = await cleanupService.scan((progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC_CHANNELS.CLEANUP.PROGRESS, progress)
        }
      })
      return success(result)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to scan for cleanup')
    }
  })

  ipcMain.handle(IPC_CHANNELS.CLEANUP.CANCEL, () => {
    try {
      return success(cleanupService.cancel())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to cancel cleanup')
    }
  })

  ipcMain.handle(IPC_CHANNELS.CLEANUP.EXECUTE, async (event, rawOptions?: unknown) => {
    try {
      if (cleanupService.isRunning()) {
        return failure('A cleanup operation is already running')
      }
      const options = validateCleanupOptions(rawOptions)
      const result = await cleanupService.execute(options, (progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC_CHANNELS.CLEANUP.PROGRESS, progress)
        }
      })
      return success(result)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Cleanup failed')
    }
  })
}

export function registerSmartScanIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SMART_SCAN.RUN, async (event) => {
    try {
      if (smartScanService.isRunning()) {
        return failure('A Smart Scan is already running')
      }
      const result = await smartScanService.run((progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send(IPC_CHANNELS.SMART_SCAN.PROGRESS, progress)
        }
      })
      return success(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Smart Scan failed'
      if (/cancelled/i.test(message)) {
        return failure('Smart Scan was paused')
      }
      return failure(message)
    }
  })

  ipcMain.handle(IPC_CHANNELS.SMART_SCAN.CANCEL, () => {
    try {
      return success(smartScanService.cancel())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to cancel Smart Scan')
    }
  })
}

export function registerUploadIpc(): void {
  ipcMain.handle(IPC_CHANNELS.UPLOAD.FILE, async (_event, rawOptions?: unknown) => {
    try {
      return success(await uploadService.uploadFile(rawOptions))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Upload failed')
    }
  })
}

export function registerAllIpc(): void {
  registerAppIpc()
  registerWindowIpc()
  registerSystemIpc()
  registerSettingsIpc()
  registerUpdaterIpc()
  registerDialogIpc()
  registerFileIpc()
  registerStorageIpc()
  registerBoostIpc()
  registerStartupIpc()
  registerCleanupIpc()
  registerSmartScanIpc()
  registerUploadIpc()
}

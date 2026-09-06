import { ipcMain, dialog, BrowserWindow, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'
import { IPC_CHANNELS, type AuthWindowMode } from '@shared/constants'
import type { IpcResponse } from '@shared/interfaces'
import {
  appService,
  boostService,
  cacheManager,
  cleanupService,
  connectivityService,
  databaseManager,
  localStorageService,
  networkStatusObserver,
  secureStorageService,
  settingsService,
  smartScanService,
  startupService,
  storageService,
  systemService,
  updaterService,
  uploadService,
  apiClient,
  toPublicApiError,
  syncEngine,
  syncProgressReporter,
  queueService,
  authSessionService,
  subscriptionSessionService,
  entitlementService
} from '@main/services'
import { toPublicQueueItem } from '@main/services/offline/security/sanitize-headers'
import { windowManager } from '@main/managers'
import type { ApiHttpMethod, ApiRequestConfig } from '@shared/interfaces'
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

function senderWindow(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
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
  ipcMain.handle(IPC_CHANNELS.APP.OPEN_EXTERNAL, async (_event, rawUrl?: unknown) => {
    try {
      if (typeof rawUrl !== 'string' || rawUrl.trim() === '') {
        throw new Error('url must be a non-empty string')
      }
      return success(await appService.openExternal(rawUrl))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to open URL')
    }
  })

  ipcMain.handle(IPC_CHANNELS.APP.WINDOW_MINIMIZE, (event) => {
    senderWindow(event)?.minimize()
    return success(null)
  })

  ipcMain.handle(IPC_CHANNELS.APP.WINDOW_TOGGLE_MAXIMIZE, (event) => {
    const window = senderWindow(event)
    if (!window) return success(null)
    if (window.isFullScreen()) {
      window.setFullScreen(false)
    } else if (window.isMaximized()) {
      window.unmaximize()
    } else if (window.isMaximizable()) {
      window.maximize()
    }
    return success(null)
  })

  ipcMain.handle(IPC_CHANNELS.APP.WINDOW_CLOSE, (event) => {
    senderWindow(event)?.close()
    return success(null)
  })

  ipcMain.handle(IPC_CHANNELS.APP.WINDOW_IS_MAXIMIZED, (event) => {
    return success(Boolean(senderWindow(event)?.isMaximized()))
  })

  ipcMain.handle(IPC_CHANNELS.APP.WINDOW_SET_LAYOUT, (event, raw?: unknown) => {
    const layout = raw === 'onboarding' ? 'onboarding' : raw === 'app' ? 'app' : null
    if (!layout) {
      return failure('layout must be onboarding or app')
    }
    const window = senderWindow(event)
    if (!window) return success(null)
    windowManager.applyLayout(window, layout)
    return success({ layout })
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
      entitlementService.assertAccess('live_monitor')
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
      entitlementService.assertAccess('storage_overview')
      return success(await storageService.analyzeUsage(mountPath))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to analyze disk usage')
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.STORAGE.FIND_LARGE_FILES,
    async (_event, options?: Parameters<typeof storageService.findLargeFiles>[0]) => {
      try {
        entitlementService.assertAccess('large_files')
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
        entitlementService.assertAccess('duplicates')
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
      // Deleting from Large Files / Duplicates is a Pro capability.
      if (
        !entitlementService.canAccess('large_files') &&
        !entitlementService.canAccess('duplicates')
      ) {
        entitlementService.assertAccess('large_files')
      }
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
      entitlementService.assertAccess('background_apps')
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
      entitlementService.assertAccess('performance_boost')
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
      entitlementService.assertAccess('startup_apps')
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
      if (options.categories.includes('temp')) {
        entitlementService.assertAccess('cleanup_temp')
      }
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

export function registerOfflineIpc(): void {
  ipcMain.handle(IPC_CHANNELS.OFFLINE.DB_HEALTH, () => {
    try {
      return success(databaseManager.health())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'DB health check failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.OFFLINE.GET_NETWORK_STATUS, () => {
    try {
      return success(connectivityService.getSnapshot())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to get network status')
    }
  })

  ipcMain.handle(IPC_CHANNELS.OFFLINE.CHECK_NETWORK, async () => {
    try {
      return success(await connectivityService.check())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Network check failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.OFFLINE.WATCH_NETWORK, (event) => {
    try {
      return success(networkStatusObserver.watch(event.sender))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to watch network')
    }
  })

  ipcMain.handle(IPC_CHANNELS.OFFLINE.UNWATCH_NETWORK, (event) => {
    try {
      return success(networkStatusObserver.unwatch(event.sender))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to unwatch network')
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.OFFLINE.STORAGE_GET,
    (_event, key?: unknown, defaultValue?: unknown, namespace?: unknown) => {
      try {
        const k = assertString(key, 'key')
        const ns =
          typeof namespace === 'string' && namespace.trim() ? namespace.trim() : 'app'
        return success(localStorageService.get(k, defaultValue, ns))
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Storage get failed')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.OFFLINE.STORAGE_SET,
    (_event, key?: unknown, value?: unknown, namespace?: unknown) => {
      try {
        const k = assertString(key, 'key')
        const ns = assertMutableNamespace(
          typeof namespace === 'string' ? namespace : 'app',
          'written'
        )
        localStorageService.set(k, value, ns)
        return success(null)
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Storage set failed')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.OFFLINE.STORAGE_DELETE,
    (_event, key?: unknown, namespace?: unknown) => {
      try {
        const k = assertString(key, 'key')
        const ns = assertMutableNamespace(
          typeof namespace === 'string' ? namespace : 'app',
          'modified'
        )
        return success(localStorageService.delete(k, ns))
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Storage delete failed')
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.OFFLINE.STORAGE_KEYS, (_event, namespace?: unknown) => {
    try {
      const ns =
        typeof namespace === 'string' && namespace.trim() ? namespace.trim() : 'app'
      return success(localStorageService.keys(ns))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Storage keys failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.OFFLINE.STORAGE_CLEAR, (_event, namespace?: unknown) => {
    try {
      const ns = assertMutableNamespace(
        typeof namespace === 'string' ? namespace : 'app',
        'cleared'
      )
      return success(localStorageService.clear(ns))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Storage clear failed')
    }
  })

  // Secure storage is main-process only (tokens). Renderer may query capability info.
  ipcMain.handle(IPC_CHANNELS.OFFLINE.SECURE_INFO, () => {
    try {
      return success({
        encryptionAvailable: secureStorageService.isEncryptionAvailable(),
        mode: secureStorageService.getMode()
      })
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Secure info failed')
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.OFFLINE.CACHE_GET,
    (_event, key?: unknown, namespace?: unknown) => {
      try {
        const k = assertString(key, 'key')
        const ns =
          typeof namespace === 'string' && namespace.trim()
            ? namespace.trim()
            : 'default'
        return success(cacheManager.get(k, ns))
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Cache get failed')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.OFFLINE.CACHE_SET,
    (_event, key?: unknown, value?: unknown, options?: unknown) => {
      try {
        const k = assertString(key, 'key')
        const opts =
          options && typeof options === 'object'
            ? (options as { ttlMs?: number; namespace?: string })
            : {}
        cacheManager.set(k, value, opts)
        return success(null)
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Cache set failed')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.OFFLINE.CACHE_DELETE,
    (_event, key?: unknown, namespace?: unknown) => {
      try {
        const k = assertString(key, 'key')
        const ns =
          typeof namespace === 'string' && namespace.trim()
            ? namespace.trim()
            : 'default'
        return success(cacheManager.delete(k, ns))
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Cache delete failed')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.OFFLINE.CACHE_HAS,
    (_event, key?: unknown, namespace?: unknown) => {
      try {
        const k = assertString(key, 'key')
        const ns =
          typeof namespace === 'string' && namespace.trim()
            ? namespace.trim()
            : 'default'
        return success(cacheManager.has(k, ns))
      } catch (err) {
        return failure(err instanceof Error ? err.message : 'Cache has failed')
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.OFFLINE.CACHE_CLEAR, (_event, namespace?: unknown) => {
    try {
      if (typeof namespace === 'string' && namespace.trim()) {
        assertMutableNamespace(namespace, 'cleared')
        return success(cacheManager.clear(namespace.trim()))
      }
      // Clearing all namespaces from renderer is not allowed (protects auth/subscription caches).
      throw new Error('Cache clear requires an explicit non-protected namespace')
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Cache clear failed')
    }
  })
}

const API_METHODS = new Set<ApiHttpMethod>([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD'
])

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

const PROTECTED_NAMESPACES = new Set(['auth', 'subscription', 'secure'])
const MAX_API_TIMEOUT_MS = 120_000
const MAX_API_BODY_CHARS = 512 * 1024

function assertMutableNamespace(namespace: string, action: string): string {
  const ns = namespace.trim() || 'app'
  if (PROTECTED_NAMESPACES.has(ns)) {
    throw new Error(`Namespace "${ns}" is protected and cannot be ${action} from renderer`)
  }
  return ns
}

function validateApiRequest(input: unknown): ApiRequestConfig {
  if (input == null || typeof input !== 'object') {
    throw new Error('Invalid API request config')
  }

  const raw = input as Record<string, unknown>
  const method = String(raw.method ?? 'GET').toUpperCase() as ApiHttpMethod

  if (!API_METHODS.has(method)) {
    throw new Error('Invalid HTTP method')
  }

  const url = assertString(raw.url, 'url')
  if (/^https?:\/\//i.test(url) || url.includes('://') || url.includes('..')) {
    throw new Error('API URL must be a relative path under the configured API base')
  }

  const config: ApiRequestConfig = { method, url }

  if (raw.params && typeof raw.params === 'object') {
    config.params = raw.params as ApiRequestConfig['params']
  }
  if ('data' in raw) {
    try {
      const serialized =
        typeof raw.data === 'string' ? raw.data : JSON.stringify(raw.data)
      if (serialized != null && serialized.length > MAX_API_BODY_CHARS) {
        throw new Error('API request body is too large')
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('too large')) throw error
      throw new Error('API request body is not serializable')
    }
    config.data = raw.data
  }
  if (raw.headers && typeof raw.headers === 'object') {
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw.headers as Record<string, unknown>)) {
      if (typeof value !== 'string') continue
      if (/^(authorization|cookie|proxy-authorization)$/i.test(key)) continue
      headers[key] = value
    }
    config.headers = headers
  }
  if (typeof raw.timeout === 'number' && Number.isFinite(raw.timeout)) {
    config.timeout = Math.min(MAX_API_TIMEOUT_MS, Math.max(1_000, Math.floor(raw.timeout)))
  }
  // Renderer must not inject bearer tokens — main auth session owns credentials.
  if (raw.cache !== undefined) {
    config.cache = raw.cache as ApiRequestConfig['cache']
  }
  if (raw.retry !== undefined) {
    config.retry = raw.retry as ApiRequestConfig['retry']
  }
  if (raw.skipOfflineCache === true) config.skipOfflineCache = true
  if (raw.skipOfflineQueue === true) config.skipOfflineQueue = true
  if (raw.skipAuth === true) config.skipAuth = true
  if (raw.skipAuthRefresh === true) config.skipAuthRefresh = true
  if (raw.unwrapEnvelope === false) config.unwrapEnvelope = false

  return config
}

export function registerApiIpc(): void {
  ipcMain.handle(IPC_CHANNELS.API.REQUEST, async (_event, rawConfig?: unknown) => {
    try {
      const config = validateApiRequest(rawConfig)
      const response = await apiClient.request(config)
      return success(response)
    } catch (err) {
      return failure(JSON.stringify(toPublicApiError(err)))
    }
  })
}

export function registerSyncIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SYNC.START, async (_event, reason?: unknown) => {
    try {
      const result = await syncEngine.synchronize({
        reason: typeof reason === 'string' && reason.trim() ? reason.trim() : 'manual'
      })
      return success(result)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Sync failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC.CANCEL, () => {
    try {
      syncEngine.cancel()
      return success({ cancelled: true })
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Sync cancel failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC.STATUS, () => {
    try {
      return success({
        running: syncEngine.isRunning,
        lastProgress: syncProgressReporter.getLastEvent(),
        queue: queueService.getStats()
      })
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Sync status failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC.QUEUE_STATS, () => {
    try {
      return success(queueService.getStats())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Queue stats failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.SYNC.QUEUE_LIST, (_event, limit?: unknown) => {
    try {
      const capped =
        typeof limit === 'number' && Number.isFinite(limit)
          ? Math.min(500, Math.max(1, Math.floor(limit)))
          : 100
      return success(queueService.listAll(capped).map(toPublicQueueItem))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Queue list failed')
    }
  })
}

function validateAuthCredentials(
  input: unknown,
  options: { passwordRequired: boolean }
): {
  email: string
  password?: string
  name?: string
} {
  if (input == null || typeof input !== 'object') {
    throw new Error('Invalid credentials')
  }
  const raw = input as Record<string, unknown>
  const email = assertString(raw.email, 'email')
  const result: { email: string; password?: string; name?: string } = { email }
  if (options.passwordRequired) {
    result.password = assertString(raw.password, 'password')
  } else if (typeof raw.password === 'string' && raw.password) {
    result.password = raw.password
  }
  if (typeof raw.name === 'string' && raw.name.trim()) {
    result.name = raw.name.trim()
  }
  return result
}

export function registerAuthIpc(): void {
  ipcMain.handle(IPC_CHANNELS.AUTH.LOGIN, async (_event, raw?: unknown) => {
    try {
      const credentials = validateAuthCredentials(raw, { passwordRequired: false })
      const session = await authSessionService.login(credentials)
      return success(session)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Login failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.REGISTER, async (_event, raw?: unknown) => {
    try {
      const credentials = validateAuthCredentials(raw, { passwordRequired: true })
      const session = await authSessionService.register(credentials)
      return success(session)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Register failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.REQUEST_OTP, async (_event, raw?: unknown) => {
    try {
      if (raw == null || typeof raw !== 'object') throw new Error('Invalid email')
      const email = assertString((raw as Record<string, unknown>).email, 'email')
      const data = await authSessionService.requestLoginOtp(email)
      return success(data)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Could not send code')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.VERIFY_OTP, async (_event, raw?: unknown) => {
    try {
      if (raw == null || typeof raw !== 'object') throw new Error('Invalid code')
      const payload = raw as Record<string, unknown>
      const email = assertString(payload.email, 'email')
      const code = assertString(payload.code, 'code')
      const session = await authSessionService.verifyLoginOtp(email, code)
      return success(session)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Could not verify code')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.FORGOT_PASSWORD, async (_event, raw?: unknown) => {
    try {
      if (raw == null || typeof raw !== 'object') throw new Error('Invalid email')
      const email = assertString((raw as Record<string, unknown>).email, 'email')
      const data = await authSessionService.forgotPassword(email)
      return success(data)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Could not send reset code')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.RESET_PASSWORD, async (_event, raw?: unknown) => {
    try {
      if (raw == null || typeof raw !== 'object') throw new Error('Invalid reset payload')
      const payload = raw as Record<string, unknown>
      const email = assertString(payload.email, 'email')
      const code = assertString(payload.code, 'code')
      const password = assertString(payload.password, 'password')
      const session = await authSessionService.resetPassword({ email, code, password })
      return success(session)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Could not reset password')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.SET_PASSWORD, async (_event, raw?: unknown) => {
    try {
      if (raw == null || typeof raw !== 'object') throw new Error('Invalid password')
      const password = assertString((raw as Record<string, unknown>).password, 'password')
      const session = await authSessionService.setPassword(password)
      return success(session)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Could not set password')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.LOGOUT, async () => {
    try {
      const session = await authSessionService.logout()
      return success(session)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Logout failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.GET_SESSION, () => {
    try {
      return success(authSessionService.getSession())
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Get session failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.SYNC, async (_event, reason?: unknown) => {
    try {
      const session = await authSessionService.synchronizeSession(
        typeof reason === 'string' && reason.trim() ? reason.trim() : 'manual'
      )
      return success(session)
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Auth sync failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.REFRESH, async () => {
    try {
      const ok = await authSessionService.refreshTokens()
      return success({ refreshed: ok, session: authSessionService.getSession() })
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Token refresh failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.HAS_PERMISSION, (_event, permission?: unknown) => {
    try {
      if (typeof permission !== 'string' || !permission.trim()) {
        throw new Error('permission must be a non-empty string')
      }
      return success(authSessionService.hasPermission(permission.trim()))
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Permission check failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.GET_SUBSCRIPTION, () => {
    try {
      return success({
        subscription: subscriptionSessionService.getCached(),
        plan: subscriptionSessionService.getCurrentPlan(),
        expiry: subscriptionSessionService.getExpiry(),
        features: subscriptionSessionService.getFeatures(),
        trial: subscriptionSessionService.getTrialStatus()
      })
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Get subscription failed')
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH.OPEN_WINDOW, (event, raw?: unknown) => {
    try {
      const mode: AuthWindowMode = raw === 'register' ? 'register' : 'login'
      const sender = senderWindow(event)
      if (windowManager.isAuthWindow(sender)) {
        sender?.focus()
        return success({ opened: true, mode })
      }
      windowManager.createAuthWindow(mode)
      return success({ opened: true, mode })
    } catch (err) {
      return failure(err instanceof Error ? err.message : 'Failed to open sign-in window')
    }
  })
}

export function registerAllIpc(): void {
  registerAppIpc()
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
  registerOfflineIpc()
  registerApiIpc()
  registerSyncIpc()
  registerAuthIpc()
}

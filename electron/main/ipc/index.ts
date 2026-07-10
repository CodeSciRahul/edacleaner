import { ipcMain, dialog, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'
import { IPC_CHANNELS } from '@shared/constants'
import type { IpcResponse } from '@shared/interfaces'
import {
  appService,
  settingsService,
  systemService,
  updaterService
} from '@main/services'

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

export function registerSystemIpc(): void {
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_INFO, () => success(systemService.getInfo()))
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_MEMORY, () => success(systemService.getMemory()))
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

export function registerAllIpc(): void {
  registerAppIpc()
  registerSystemIpc()
  registerSettingsIpc()
  registerUpdaterIpc()
  registerDialogIpc()
  registerFileIpc()
}







/*
 * =============================================================================
 * IPC — Inter-Process Communication (Express controller jaisa layer)
 * =============================================================================
 *
 * Yeh file MAIN PROCESS side ka IPC layer hai.
 * Kaam: channel match karke request receive karna → service/logic call → response bhejna
 *
 * Yeh file business logic define karne ki jagah NAHI hai (ideal pattern).
 * Zyada tar handlers patle hon — service ko call karo, success()/failure() se wrap karke return.
 * Exception: file/ dialog handlers abhi direct Node/Electron API use karte hain (baad mein
 * FileService / DialogService mein shift ho sakta hai).
 *
 * -----------------------------------------------------------------------------
 * POORA REQ → RES CYCLE (3 layers)
 * -----------------------------------------------------------------------------
 *
 *   React UI
 *     → window.electron.app.getVersion()
 *
 *   Preload (electron/preload/index.ts) — CLIENT side
 *     → ipcRenderer.invoke('app:get-version')     ← REQUEST bhejta hai
 *     → handler ka return value Promise mein milta hai
 *     → success/error unwrap karke React ko data deta hai
 *
 *   Main IPC (YAHAN — electron/main/ipc/index.ts) — SERVER side
 *     → ipcMain.handle('app:get-version', handler)  ← REQUEST receive + RESPONSE bhejta hai
 *     → handler jo return kare woh preload tak wapas jata hai
 *
 *   Service (electron/main/services/) — BUSINESS LOGIC
 *     → appService.getVersion(), systemService.getInfo(), etc.
 *     → actual kaam (Electron app API, os, settings store)
 *
 * -----------------------------------------------------------------------------
 * ipcRenderer vs ipcMain — difference
 * -----------------------------------------------------------------------------
 *
 *   ipcRenderer  (preload mein)
 *     - Renderer/preload side — message BHEJTA hai
 *     - .invoke(channel, ...args) → Promise return (response ka wait)
 *     - React directly use NAHI karta (security); sirf preload use karta hai
 *
 *   ipcMain  (yahan is file mein)
 *     - Main process side — message SUNTA hai
 *     - .handle(channel, handler) → channel match pe handler chalta hai
 *     - handler ka return value automatically ipcRenderer.invoke() ko resolve karta hai
 *
 *   Dono ko SAME channel name chahiye → isliye shared/constants IPC_CHANNELS use hota hai
 *
 * -----------------------------------------------------------------------------
 * CHANNEL — kya hota hai?
 * -----------------------------------------------------------------------------
 *
 *   Channel = message ka string ID / route name (e.g. 'app:get-version', 'file:read')
 *   ipcRenderer.invoke('app:get-version')  aur  ipcMain.handle('app:get-version', ...)
 *   dono match hone par hi request handler tak pahunchti hai.
 *
 * -----------------------------------------------------------------------------
 * success() / failure() — response format (req/res wrapper)
 * -----------------------------------------------------------------------------
 *
 *   success(data)  →  { success: true, data }
 *   failure(msg)   →  { success: false, error }
 *
 *   Preload invoke() helper:
 *     - success: true  → data return karta hai React ko
 *     - success: false → Error throw karta hai
 *
 *   Yeh Express controller ka res.json({ ... }) jaisa standard format hai.
 *
 * -----------------------------------------------------------------------------
 * ipcMain.handle(channel, handler) — handler signature
 * -----------------------------------------------------------------------------
 *
 *   handler ka return value = response jo preload ko milta hai (Promise resolve)
 *
 *   (_event, ...args) =>
 *     _event  — IPC event object (zyada tar ignore; _ prefix)
 *     ...args — preload se bheje gaye arguments (e.g. filePath, key, options)
 *
 *   Example:
 *     Preload:  invoke('app:get-path', 'desktop')
 *     Handler:  (_event, name) => success(appService.getPath(name))
 *
 * -----------------------------------------------------------------------------
 * IS FILE KE FUNCTIONS — kya register karte hain
 * -----------------------------------------------------------------------------
 *
 *   registerAppIpc()      → app:get-version, quit, relaunch, get-path  → appService
 *   registerSystemIpc()   → system:get-info, get-memory                 → systemService
 *   registerSettingsIpc() → settings:get, set, get-all, reset            → settingsService
 *   registerUpdaterIpc()  → updater:check, download, install, status      → updaterService
 *   registerDialogIpc()   → dialog:open, save, message, error            → dialog API (direct)
 *   registerFileIpc()     → file:read, write, exists                     → fs API (direct)
 *   registerAllIpc()      → bootstrap se call — saare handlers ek saath register
 *
 * -----------------------------------------------------------------------------
 * IDEAL RULE (Express jaisa)
 * -----------------------------------------------------------------------------
 *
 *   IPC (controller)     →  routing + channel match + success/failure wrap
 *   Service              →  actual business logic
 *
 *   Flow:  invoke(channel, args) → handle match → service.method(args) → success(result)
 *
 * -----------------------------------------------------------------------------
 * KAB REGISTER HOTA HAI?
 * -----------------------------------------------------------------------------
 *
 *   bootstrap() → registerAllIpc() → window khulne SE PEHLE
 *   Taaki UI load hote hi saare API endpoints ready hon.
 */
import { ipcMain, dialog, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import { readFile, writeFile, access } from 'fs/promises'
import { constants } from 'fs'
import { IPC_CHANNELS } from '@shared/constants'
import type { IpcResponse } from '@shared/interfaces'
import {
  appService,
  settingsService,
  storageService,
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

export function registerAllIpc(): void {
  registerAppIpc()
  registerSystemIpc()
  registerSettingsIpc()
  registerUpdaterIpc()
  registerDialogIpc()
  registerFileIpc()
  registerStorageIpc()
}

import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS } from '@shared/constants'
import { configManager } from '@main/config'
import { getMainWindowOptions, getRendererPath } from '@main/windows'

export class WindowManager {
  private static instance: WindowManager
  private windows: Map<string, BrowserWindow> = new Map()

  private constructor() {}

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }

  createMainWindow(): BrowserWindow {
    const existing = this.windows.get('main')
    if (existing && !existing.isDestroyed()) {
      existing.focus()
      return existing
    }

    const config = configManager.get()
    const preloadPath = join(__dirname, '../preload/index.js')
    const window = new BrowserWindow({
      ...getMainWindowOptions(preloadPath),
      title: config.name
    })

    window.setMenuBarVisibility(false)
    window.removeMenu()

    window.on('ready-to-show', () => {
      window.show()
    })

    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      window.loadFile(getRendererPath())
    }

    if (config.featureFlags.enableDevTools) {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    this.windows.set('main', window)

    const emitMaximized = (): void => {
      if (window.isDestroyed()) return
      window.webContents.send(
        IPC_CHANNELS.APP.WINDOW_MAXIMIZED_CHANGED,
        window.isMaximized()
      )
    }
    window.on('maximize', emitMaximized)
    window.on('unmaximize', emitMaximized)
    window.on('enter-full-screen', emitMaximized)
    window.on('leave-full-screen', emitMaximized)

    window.on('closed', () => {
      this.windows.delete('main')
    })

    return window
  }

  getMainWindow(): BrowserWindow | null {
    const window = this.windows.get('main')
    return window && !window.isDestroyed() ? window : null
  }

  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values()).filter((w) => !w.isDestroyed())
  }

  closeAll(): void {
    this.getAllWindows().forEach((window) => window.close())
  }
}

export const windowManager = WindowManager.getInstance()

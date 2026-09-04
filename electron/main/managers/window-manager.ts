import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { IPC_CHANNELS, WINDOW_DEFAULTS, type AuthWindowMode, type WindowLayout } from '@shared/constants'
import { configManager } from '@main/config'
import {
  getAuthWindowHash,
  getAuthWindowOptions,
  getMainWindowOptions,
  getRendererPath,
  createSplashWindow,
  closeSplashWindow,
  SPLASH_MIN_VISIBLE_MS
} from '@main/windows'

export class WindowManager {
  private static instance: WindowManager
  private windows: Map<string, BrowserWindow> = new Map()
  /** When true, main window waits for splash handoff instead of showing itself. */
  private splashHandoffPending = false

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

    // Shown by bootstrap after the splash handoff (or immediately if no splash).
    window.on('ready-to-show', () => {
      if (window.isDestroyed()) return
      if (!this.splashHandoffPending) {
        window.show()
      }
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
      this.closeAuthWindow()
    })

    return window
  }

  /**
   * Show the animated brand splash, create the main window behind it, then
   * hand off once the main UI is ready and the splash has been visible briefly.
   */
  async launchWithSplash(): Promise<BrowserWindow> {
    this.splashHandoffPending = true
    const splash = createSplashWindow()

    const splashVisibleAt = await new Promise<number>((resolve) => {
      if (!splash) {
        resolve(Date.now())
        return
      }
      if (splash.isVisible()) {
        resolve(Date.now())
        return
      }
      const done = (): void => resolve(Date.now())
      splash.once('ready-to-show', done)
      // Fallback if ready-to-show never fires
      setTimeout(done, 3_000)
    })

    if (!splash) {
      this.splashHandoffPending = false
    }

    const main = this.createMainWindow()

    if (!splash) {
      if (!main.isDestroyed() && !main.isVisible()) {
        main.show()
      }
      return main
    }

    await new Promise<void>((resolve) => {
      if (main.isDestroyed()) {
        resolve()
        return
      }
      const done = (): void => resolve()
      main.once('ready-to-show', done)
      // Safety: never block launch forever if ready-to-show is missed
      setTimeout(done, 15_000)
    })

    const remaining = Math.max(0, SPLASH_MIN_VISIBLE_MS - (Date.now() - splashVisibleAt))
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining))
    }

    this.splashHandoffPending = false
    if (!main.isDestroyed()) {
      main.show()
      main.focus()
    }
    closeSplashWindow(splash)
    return main
  }

  createAuthWindow(mode: AuthWindowMode = 'login'): BrowserWindow {
    const existing = this.windows.get('auth')
    if (existing && !existing.isDestroyed()) {
      this.loadAuthRoute(existing, mode)
      if (existing.isMinimized()) existing.restore()
      existing.show()
      existing.focus()
      return existing
    }

    const preloadPath = join(__dirname, '../preload/index.js')
    const window = new BrowserWindow(
      getAuthWindowOptions(preloadPath, this.getMainWindow())
    )

    window.setMenuBarVisibility(false)
    window.removeMenu()

    window.on('ready-to-show', () => {
      window.show()
      window.focus()
    })

    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    this.loadAuthRoute(window, mode)
    this.windows.set('auth', window)
    this.applyLayout(window, 'onboarding')

    const emitMaximized = (): void => {
      if (window.isDestroyed()) return
      window.webContents.send(
        IPC_CHANNELS.APP.WINDOW_MAXIMIZED_CHANGED,
        window.isMaximized()
      )
    }
    window.on('maximize', emitMaximized)
    window.on('unmaximize', emitMaximized)

    window.on('closed', () => {
      this.windows.delete('auth')
    })

    return window
  }

  getAuthWindow(): BrowserWindow | null {
    const window = this.windows.get('auth')
    return window && !window.isDestroyed() ? window : null
  }

  closeAuthWindow(): void {
    const window = this.getAuthWindow()
    if (!window) return
    window.close()
  }

  isAuthWindow(window: BrowserWindow | null): boolean {
    const auth = this.getAuthWindow()
    return Boolean(window && auth && window.id === auth.id)
  }

  private loadAuthRoute(window: BrowserWindow, mode: AuthWindowMode): void {
    const hash = getAuthWindowHash(mode)
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const base = process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '')
      window.loadURL(`${base}/#${hash}`)
      return
    }
    window.loadFile(getRendererPath(), { hash })
  }

  applyLayout(window: BrowserWindow, layout: WindowLayout): void {
    if (window.isDestroyed()) return
    if (this.isAuthWindow(window)) {
      this.applyFixedArtLayout(window, {
        width: WINDOW_DEFAULTS.AUTH_WIDTH,
        height: WINDOW_DEFAULTS.AUTH_HEIGHT,
        minWidth: WINDOW_DEFAULTS.AUTH_MIN_WIDTH,
        minHeight: WINDOW_DEFAULTS.AUTH_MIN_HEIGHT,
        ratio: WINDOW_DEFAULTS.AUTH_ASPECT_RATIO,
        offsetFromMain: true
      })
      return
    }
    if (layout === 'onboarding') {
      this.applyFixedArtLayout(window, {
        width: WINDOW_DEFAULTS.ONBOARDING_WIDTH,
        height: WINDOW_DEFAULTS.ONBOARDING_HEIGHT,
        minWidth: WINDOW_DEFAULTS.ONBOARDING_MIN_WIDTH,
        minHeight: WINDOW_DEFAULTS.ONBOARDING_MIN_HEIGHT,
        ratio: WINDOW_DEFAULTS.ONBOARDING_ASPECT_RATIO
      })
      return
    }
    this.applyAppLayout(window)
  }

  private applyFixedArtLayout(
    window: BrowserWindow,
    size: {
      width: number
      height: number
      minWidth: number
      minHeight: number
      ratio: number
      offsetFromMain?: boolean
    }
  ): void {
    if (window.isMaximized()) window.unmaximize()
    if (window.isFullScreen()) window.setFullScreen(false)

    const fitted = this.fitWindowToWorkArea(size)
    window.setMaximizable(false)
    window.setMinimumSize(fitted.minWidth, fitted.minHeight)
    window.setSize(fitted.width, fitted.height)
    window.setAspectRatio(size.ratio)

    if (size.offsetFromMain) {
      this.positionRelativeToMain(window, fitted.width, fitted.height)
    } else {
      window.center()
    }
  }

  /** Place auth slightly down-right of onboarding so both windows read as open. */
  private positionRelativeToMain(
    window: BrowserWindow,
    width: number,
    height: number
  ): void {
    const main = this.getMainWindow()
    const display = screen.getDisplayMatching(main?.getBounds() ?? window.getBounds())
    const work = display.workArea

    let x: number
    let y: number

    if (main && !main.isDestroyed()) {
      const bounds = main.getBounds()
      x = bounds.x + WINDOW_DEFAULTS.AUTH_OFFSET_X
      y = bounds.y + WINDOW_DEFAULTS.AUTH_OFFSET_Y
    } else {
      x = Math.round(work.x + (work.width - width) / 2) + WINDOW_DEFAULTS.AUTH_OFFSET_X
      y = Math.round(work.y + (work.height - height) / 2) + WINDOW_DEFAULTS.AUTH_OFFSET_Y
    }

    const maxX = work.x + Math.max(0, work.width - width)
    const maxY = work.y + Math.max(0, work.height - height)
    x = Math.min(Math.max(work.x, x), maxX)
    y = Math.min(Math.max(work.y, y), maxY)

    window.setPosition(x, y)
  }

  private fitWindowToWorkArea(size: {
    width: number
    height: number
    minWidth: number
    minHeight: number
    ratio: number
  }): { width: number; height: number; minWidth: number; minHeight: number } {
    const work = screen.getPrimaryDisplay().workAreaSize
    const pad = 48
    const maxW = Math.max(640, work.width - pad)
    const maxH = Math.max(480, work.height - pad)

    let width = size.width
    let height = size.height
    if (width > maxW) {
      width = maxW
      height = Math.round(width / size.ratio)
    }
    if (height > maxH) {
      height = maxH
      width = Math.round(height * size.ratio)
    }

    const minWidth = Math.min(size.minWidth, width)
    const minHeight = Math.min(size.minHeight, height)
    return { width, height, minWidth, minHeight }
  }

  private applyAppLayout(window: BrowserWindow): void {
    if (window.isMaximized()) window.unmaximize()
    window.setAspectRatio(0)
    window.setMaximizable(true)
    window.setMinimumSize(WINDOW_DEFAULTS.MIN_WIDTH, WINDOW_DEFAULTS.MIN_HEIGHT)
    window.setSize(WINDOW_DEFAULTS.WIDTH, WINDOW_DEFAULTS.HEIGHT)
    window.center()
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

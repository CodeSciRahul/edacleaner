import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { resolveAppIconPath } from '@main/utils/app-icon'
import { createLogger } from '@main/utils/logger'

const log = createLogger('Splash')

/** Keep the animated mark on screen long enough to read as intentional, not a flash. */
export const SPLASH_MIN_VISIBLE_MS = 2000

const SPLASH_SIZE = 360

function resolveSplashDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'splash')
  }
  // electron-vite: out/main → repo root resources/splash
  return join(__dirname, '../../resources/splash')
}

function resolveSplashHtml(): string | null {
  const htmlPath = join(resolveSplashDir(), 'index.html')
  if (!existsSync(htmlPath)) {
    log.warn('Splash HTML missing', { htmlPath })
    return null
  }
  const gifPath = join(resolveSplashDir(), 'splash-logo-loop.gif')
  if (!existsSync(gifPath)) {
    log.warn('Splash GIF missing', { gifPath })
    return null
  }
  return htmlPath
}

export function createSplashWindow(): BrowserWindow | null {
  const htmlPath = resolveSplashHtml()
  if (!htmlPath) return null

  const icon = resolveAppIconPath()
  const window = new BrowserWindow({
    width: SPLASH_SIZE,
    height: SPLASH_SIZE,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    frame: false,
    transparent: false,
    backgroundColor: '#2563EB',
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    roundedCorners: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.setMenuBarVisibility(false)
  window.removeMenu()
  window.center()

  void window.loadFile(htmlPath)

  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) {
      window.show()
      window.focus()
    }
  })

  return window
}

export function closeSplashWindow(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  window.close()
}

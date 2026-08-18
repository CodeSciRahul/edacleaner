import type { BrowserWindowConstructorOptions } from 'electron'
import { WINDOW_DEFAULTS } from '@shared/constants'
import { resolveAppIconPath } from '@main/utils/app-icon'

export function getAuthWindowOptions(
  preloadPath: string,
  parent?: Electron.BrowserWindow | null
): BrowserWindowConstructorOptions {
  const icon = resolveAppIconPath()

  return {
    width: WINDOW_DEFAULTS.AUTH_WIDTH,
    height: WINDOW_DEFAULTS.AUTH_HEIGHT,
    minWidth: WINDOW_DEFAULTS.AUTH_MIN_WIDTH,
    minHeight: WINDOW_DEFAULTS.AUTH_MIN_HEIGHT,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    maximizable: false,
    backgroundColor: '#d7eaf6',
    ...(parent && !parent.isDestroyed() ? { parent } : {}),
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  }
}

export function getAuthWindowHash(mode: 'login' | 'register'): string {
  return `/auth?mode=${mode}`
}

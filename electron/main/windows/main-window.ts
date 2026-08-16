import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
import { WINDOW_DEFAULTS } from '@shared/constants'
import { resolveAppIconPath } from '@main/utils/app-icon'

export function getMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  const icon = resolveAppIconPath()

  return {
    width: WINDOW_DEFAULTS.WIDTH,
    height: WINDOW_DEFAULTS.HEIGHT,
    minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
    minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  }
}

export function getRendererUrl(): string | null {
  return process.env['ELECTRON_RENDERER_URL'] ?? null
}

export function getRendererPath(): string {
  return join(__dirname, '../renderer/index.html')
}

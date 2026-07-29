import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
import { WINDOW_DEFAULTS } from '@shared/constants'
import { getAppIconPath } from '@main/utils/app-icon'

const isMac = process.platform === 'darwin'

export function getMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: WINDOW_DEFAULTS.WIDTH,
    height: WINDOW_DEFAULTS.HEIGHT,
    minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
    minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    icon: getAppIconPath(),
    backgroundColor: '#0F172A',
    // macOS: hide native title text, keep system traffic lights inset into chrome
    // Windows / Linux: frameless — custom window controls in the renderer
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: {
            x: 14,
            y: Math.round((WINDOW_DEFAULTS.TITLEBAR_HEIGHT - 12) / 2)
          }
        }
      : {
          frame: false
        }),
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

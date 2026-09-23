import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'

/** Matches renderer `h-titlebar` (44px). */
const TITLEBAR_HEIGHT_PX = 44
/** Approximate macOS traffic-light diameter for vertical centering. */
const TRAFFIC_LIGHT_SIZE_PX = 14

/**
 * Platform-specific BrowserWindow chrome.
 * macOS: native traffic lights via hiddenInset (custom Win/Linux controls stay in the renderer).
 */
export function getPlatformWindowChromeOptions(): Pick<
  BrowserWindowConstructorOptions,
  'frame' | 'titleBarStyle' | 'trafficLightPosition'
> {
  if (process.platform === 'darwin') {
    return {
      frame: false,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: {
        x: 16,
        y: Math.round((TITLEBAR_HEIGHT_PX - TRAFFIC_LIGHT_SIZE_PX) / 2)
      }
    }
  }

  return {
    frame: false,
    titleBarStyle: 'hidden'
  }
}

/** Ensure traffic lights remain visible when using a frameless window on macOS. */
export function ensureNativeWindowButtons(window: BrowserWindow): void {
  if (process.platform !== 'darwin' || window.isDestroyed()) return
  window.setWindowButtonVisibility(true)
}

import type { BrowserWindowConstructorOptions } from 'electron'

/**
 * Matches renderer `h-titlebar` (44px). Traffic lights sit in the left sidebar
 * rail cell of that single-height titlebar (branding is in the Sidebar below).
 */
const TITLEBAR_HEIGHT_PX = 44
/** Approximate macOS traffic-light diameter for vertical centering. */
const TRAFFIC_LIGHT_SIZE_PX = 14
/**
 * Horizontal inset so the three lights fit inside the collapsed sidebar rail
 * (~68px) without widening it.
 */
const TRAFFIC_LIGHT_X_PX = 12

/**
 * Platform-specific BrowserWindow chrome.
 *
 * On macOS, `hiddenInset` already creates a native titled window whose title
 * bar is overlaid by the web content. Do not combine it with `frame: false` or
 * manually force the native buttons visible: changing maximizable state while
 * that unsupported combination is active can trip Chromium/AppKit checks.
 *
 * Windows and Linux continue to use the frameless window with renderer-owned
 * caption buttons.
 */
export function getPlatformWindowChromeOptions(): Pick<
  BrowserWindowConstructorOptions,
  'frame' | 'titleBarStyle' | 'trafficLightPosition'
> {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: {
        x: TRAFFIC_LIGHT_X_PX,
        y: Math.round((TITLEBAR_HEIGHT_PX - TRAFFIC_LIGHT_SIZE_PX) / 2)
      }
    }
  }

  return {
    frame: false,
    titleBarStyle: 'hidden'
  }
}

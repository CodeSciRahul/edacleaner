import type { BrowserWindowConstructorOptions } from 'electron'

/**
 * Matches renderer `h-traffic-lights` (36px). App titlebar stacks branding
 * under this row so the logo never shares space with the native buttons.
 */
const TRAFFIC_LIGHT_ROW_PX = 36
/** Approximate macOS traffic-light diameter for vertical centering. */
const TRAFFIC_LIGHT_SIZE_PX = 14

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
        x: 16,
        y: Math.round((TRAFFIC_LIGHT_ROW_PX - TRAFFIC_LIGHT_SIZE_PX) / 2)
      }
    }
  }

  return {
    frame: false,
    titleBarStyle: 'hidden'
  }
}

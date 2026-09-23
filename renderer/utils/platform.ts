/**
 * Sync platform helpers for renderer chrome.
 * Uses preload-exposed `app.platform` (no IPC) so titlebar controls never flash.
 */

export function getAppPlatform(): string {
  try {
    return window.electron?.app?.platform ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function isMacOS(): boolean {
  return getAppPlatform() === 'darwin'
}

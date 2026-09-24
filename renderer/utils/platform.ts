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

function guessMacFromNavigator(): boolean {
  if (typeof navigator === 'undefined') return false
  const platform = navigator.platform || ''
  const ua = navigator.userAgent || ''
  return /Mac|iPhone|iPad|iPod/i.test(platform) || /Macintosh|Mac OS X/i.test(ua)
}

export function isMacOS(): boolean {
  const platform = getAppPlatform()
  if (platform === 'darwin') return true
  if (platform !== 'unknown') return false
  // Preload missing / late — still keep chrome clear of native traffic lights.
  return guessMacFromNavigator()
}

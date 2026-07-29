import { join } from 'path'
import { existsSync } from 'fs'
import { app } from 'electron'

/**
 * Resolve the packaged / dev path to the app icon used by BrowserWindow
 * and the dock / task switcher. Prefers platform-native assets from
 * electron-builder (`resources/icons`).
 */
export function getAppIconPath(): string {
  const fileName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'

  const candidates = [
    join(process.resourcesPath, 'icons', fileName),
    join(app.getAppPath(), 'resources', 'icons', fileName),
    join(__dirname, '../../resources/icons', fileName),
    join(__dirname, '../../../resources/icons', fileName)
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  return candidates[candidates.length - 1]!
}

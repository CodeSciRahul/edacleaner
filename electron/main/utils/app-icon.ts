import { app } from 'electron'
import { join } from 'path'

/**
 * Resolve the packaged / dev path to the app icon used by BrowserWindow
 * (title bar, taskbar, Alt-Tab). Packaging also embeds platform icons via
 * electron-builder (`resources/icons`).
 */
export function getAppIconPath(): string {
  const fileName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'

  if (app.isPackaged) {
    return join(process.resourcesPath, 'icons', fileName)
  }

  return join(__dirname, '../../resources/icons', fileName)
}

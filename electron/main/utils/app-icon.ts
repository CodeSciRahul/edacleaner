import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Resolve the native app icon for BrowserWindow (Windows/Linux).
 * macOS uses the bundled .icns — BrowserWindow.icon is ignored there.
 */
export function resolveAppIconPath(): string | undefined {
  if (process.platform === 'darwin') {
    return undefined
  }

  const preferred =
    process.platform === 'win32' ? ['icon.ico', 'icon.png'] : ['icon.png', '512.png']

  const bases = app.isPackaged
    ? [join(process.resourcesPath, 'icons')]
    : [
        join(app.getAppPath(), 'resources', 'icons'),
        join(__dirname, '../../resources/icons')
      ]

  for (const base of bases) {
    for (const fileName of preferred) {
      const candidate = join(base, fileName)
      if (existsSync(candidate)) {
        return candidate
      }
    }
  }

  return undefined
}

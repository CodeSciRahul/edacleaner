import { app, BrowserWindow } from 'electron'
import { optimizer } from '@electron-toolkit/utils'
import { windowManager } from '@main/managers'

export function registerAppEvents(): void {
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow()
    }
  })
}

export function registerLifecycleEvents(): void {
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

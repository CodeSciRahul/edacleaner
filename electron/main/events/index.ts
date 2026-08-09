import { app, BrowserWindow } from 'electron'
import { optimizer } from '@electron-toolkit/utils'
import { windowManager } from '@main/managers'
import { createLogger } from '@main/utils/logger'

const log = createLogger('Lifecycle')

let shuttingDown = false

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

  app.on('before-quit', (event) => {
    if (shuttingDown) return

    event.preventDefault()
    shuttingDown = true
    log.info('Safe shutdown started')

    void (async () => {
      try {
        const { shutdownOfflineFoundation } = await import('@main/services/offline')
        await shutdownOfflineFoundation()
      } catch (error) {
        log.error('Offline foundation shutdown failed', error)
      } finally {
        log.info('Safe shutdown complete')
        app.exit(0)
      }
    })()
  })
}

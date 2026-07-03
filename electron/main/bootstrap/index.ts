import { app, session } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { configManager } from '@main/config'
import { windowManager } from '@main/managers'
import { registerAllIpc } from '@main/ipc'
import { registerAppEvents, registerLifecycleEvents } from '@main/events'
import { getContentSecurityPolicy } from '@main/utils'

export async function bootstrap(): Promise<void> {
  const config = configManager.get()

  electronApp.setAppUserModelId(config.isPackaged ? 'com.edacleaner.app' : 'com.edacleaner.dev')

  registerAppEvents()
  registerLifecycleEvents()
  registerAllIpc()

  await app.whenReady()

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [getContentSecurityPolicy()]
      }
    })
  })

  windowManager.createMainWindow()
}

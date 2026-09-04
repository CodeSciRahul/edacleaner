import { app, session } from 'electron'
import { electronApp } from '@electron-toolkit/utils'
import { configManager } from '@main/config'
import { windowManager } from '@main/managers'
import { registerAllIpc } from '@main/ipc'
import { registerAppEvents, registerLifecycleEvents } from '@main/events'
import { getContentSecurityPolicy } from '@main/utils'
import { initializeOfflineFoundation } from '@main/services/offline'
import { deepLinkService } from '@main/services/deep-link.service'
import { createLogger } from '@main/utils/logger'

const log = createLogger('Bootstrap')

export async function bootstrap(): Promise<void> {
  const config = configManager.get()

  // Must run before ready — ensures deep links reopen this process instead of a second copy.
  if (!deepLinkService.claimSingleInstance()) {
    app.quit()
    return
  }

  electronApp.setAppUserModelId(config.isPackaged ? 'com.edacleaner.app' : 'com.edacleaner.dev')

  deepLinkService.registerProtocolClient()
  deepLinkService.initialize()

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

  try {
    await initializeOfflineFoundation()
  } catch (error) {
    log.error('Offline foundation failed to initialize', error)
    // App can still run local PC tools; durable storage may be unavailable.
  }

  await windowManager.launchWithSplash()
  deepLinkService.flushPending()
}

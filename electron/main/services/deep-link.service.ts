import { app, BrowserWindow } from 'electron'
import path from 'path'
import { DEEP_LINK_PROTOCOL, IPC_CHANNELS } from '@shared/constants'
import type { DeepLinkEvent } from '@shared/interfaces'
import { windowManager } from '@main/managers'
import { createLogger } from '@main/utils/logger'

const log = createLogger('DeepLink')

const PROTOCOL = DEEP_LINK_PROTOCOL

function extractUrlFromArgv(argv: string[]): string | null {
  const match = argv.find(
    (arg) => typeof arg === 'string' && arg.toLowerCase().startsWith(`${PROTOCOL}://`)
  )
  return match ?? null
}

function parseDeepLink(rawUrl: string): DeepLinkEvent {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return {
      url: rawUrl,
      path: '',
      action: 'unknown',
      sessionId: null,
      receivedAt: Date.now()
    }
  }

  const pathName = `${url.host}${url.pathname}`.replace(/\/+$/, '').toLowerCase()
  const sessionId = url.searchParams.get('session_id')

  let action: DeepLinkEvent['action'] = 'unknown'
  if (pathName === 'checkout/success' || pathName.endsWith('/checkout/success')) {
    action = 'checkout-success'
  } else if (pathName === 'checkout/cancel' || pathName.endsWith('/checkout/cancel')) {
    action = 'checkout-cancel'
  }

  return {
    url: rawUrl,
    path: pathName,
    action,
    sessionId,
    receivedAt: Date.now()
  }
}

/**
 * Registers `edacleaner://` and routes checkout return URLs into the running app.
 * Windows uses second-instance argv; macOS uses open-url.
 */
export class DeepLinkService {
  private wired = false
  private pendingUrl: string | null = null

  /** Call as early as possible (before ready). Returns false if another instance owns the lock. */
  claimSingleInstance(): boolean {
    const gotLock = app.requestSingleInstanceLock()
    if (!gotLock) {
      log.info('Another instance holds the lock — quitting')
      return false
    }

    app.on('second-instance', (_event, argv) => {
      const url = extractUrlFromArgv(argv)
      this.focusMainWindow()
      if (url) {
        void this.handleUrl(url)
      }
    })

    return true
  }

  registerProtocolClient(): void {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        const appPath = path.resolve(process.argv[1])
        app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [appPath])
      }
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL)
    }
    log.info('Registered as default protocol client', { protocol: PROTOCOL })
  }

  initialize(): void {
    if (this.wired) return
    this.wired = true

    app.on('open-url', (event, url) => {
      event.preventDefault()
      void this.handleUrl(url)
    })

    // Cold start on Windows: protocol URL may be in process.argv
    const coldStart = extractUrlFromArgv(process.argv)
    if (coldStart) {
      this.pendingUrl = coldStart
    }

    log.info('Deep link service initialized')
  }

  /** Flush any URL received before the main window existed. */
  flushPending(): void {
    if (!this.pendingUrl) return
    const url = this.pendingUrl
    this.pendingUrl = null
    void this.handleUrl(url)
  }

  async handleUrl(rawUrl: string): Promise<void> {
    const event = parseDeepLink(rawUrl)
    log.info('Deep link received', {
      action: event.action,
      path: event.path,
      sessionId: event.sessionId
    })

    this.focusMainWindow()
    this.emitToRenderers(event)

    if (event.action === 'checkout-success') {
      try {
        const { authSessionService } = await import('@main/services/auth')
        if (authSessionService.isAuthenticated()) {
          await authSessionService.synchronizeSession('deep-link-checkout-success')
        }
      } catch (error) {
        log.warn('Post-checkout subscription sync failed', {
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
  }

  private focusMainWindow(): void {
    let win = windowManager.getMainWindow()
    if (!win || win.isDestroyed()) {
      win = windowManager.createMainWindow()
    }
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  private emitToRenderers(event: DeepLinkEvent): void {
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.webContents.isDestroyed()) continue
      win.webContents.send(IPC_CHANNELS.APP.DEEP_LINK, event)
    }
  }
}

export const deepLinkService = new DeepLinkService()

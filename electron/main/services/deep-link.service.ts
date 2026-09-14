import { app, BrowserWindow } from 'electron'
import { execFile } from 'node:child_process'
import path from 'path'
import { APP_NAME, DEEP_LINK_PROTOCOL, IPC_CHANNELS } from '@shared/constants'
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
 * Chrome/Edge read the protocol handler display name from Windows association
 * metadata (FriendlyAppName), falling back to the EXE FileDescription.
 * Set short, professional labels so the "Open app?" dialog is not truncated.
 */
function setWindowsProtocolDisplayName(exePath: string): void {
  if (process.platform !== 'win32') return

  const exeName = path.basename(exePath)
  if (!exeName || exeName.includes('..')) return

  const protocolKey = `HKCU\\Software\\Classes\\${PROTOCOL}`
  const applicationKey = `${protocolKey}\\Application`
  const friendlyKey = `HKCU\\Software\\Classes\\Applications\\${exeName}`

  const runReg = (args: string[]) => {
    execFile('reg', args, { windowsHide: true }, (error) => {
      if (error) {
        log.warn('Failed to update protocol display name registry', {
          args,
          error: error.message
        })
      }
    })
  }

  runReg(['add', protocolKey, '/ve', '/d', `URL:${APP_NAME}`, '/f'])
  runReg(['add', applicationKey, '/v', 'ApplicationName', '/t', 'REG_SZ', '/d', APP_NAME, '/f'])
  runReg(['add', friendlyKey, '/v', 'FriendlyAppName', '/t', 'REG_SZ', '/d', APP_NAME, '/f'])
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
    let registeredExe = process.execPath

    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        const appPath = path.resolve(process.argv[1])
        app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [appPath])
      }
    } else {
      app.setAsDefaultProtocolClient(PROTOCOL)
      registeredExe = process.execPath
    }

    setWindowsProtocolDisplayName(registeredExe)
    // Also label the packaged product EXE name (may still own the protocol while developing).
    setWindowsProtocolDisplayName(`${APP_NAME}.exe`)

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

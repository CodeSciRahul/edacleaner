import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { configManager } from '@main/config'
import { getMainWindowOptions, getRendererPath } from '@main/windows'

export class WindowManager {
  private static instance: WindowManager
  private windows: Map<string, BrowserWindow> = new Map()

  private constructor() {}

  static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager()
    }
    return WindowManager.instance
  }

  createMainWindow(): BrowserWindow {
    const existing = this.windows.get('main')
    if (existing && !existing.isDestroyed()) {
      existing.focus()
      return existing
    }

    const config = configManager.get()
    const preloadPath = join(__dirname, '../preload/index.js')
    const window = new BrowserWindow({
      ...getMainWindowOptions(preloadPath),
      title: config.name
    })

    window.on('ready-to-show', () => {
      window.show()
    })

    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      window.loadFile(getRendererPath())
    }

    if (config.featureFlags.enableDevTools) {
      window.webContents.openDevTools({ mode: 'detach' })
    }

    this.windows.set('main', window)

    window.on('closed', () => {
      this.windows.delete('main')
    })

    return window
  }

  getMainWindow(): BrowserWindow | null {
    const window = this.windows.get('main')
    return window && !window.isDestroyed() ? window : null
  }

  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values()).filter((w) => !w.isDestroyed())
  }

  closeAll(): void {
    this.getAllWindows().forEach((window) => window.close())
  }
}

export const windowManager = WindowManager.getInstance()

/*
 * =============================================================================
 * WINDOW MANAGER — Desktop window create / track / focus / close
 * =============================================================================
 *
 * Yeh file IPC ya business logic NAHI hai.
 * Kaam: Electron BrowserWindow (jo screen pe dikhti hai) manage karna.
 *
 *   IPC / services  →  data & actions (version, files, settings)
 *   WindowManager   →  UI window lifecycle (open, focus, track, close)
 *
 * -----------------------------------------------------------------------------
 * SINGLETON
 * -----------------------------------------------------------------------------
 *
 *   private constructor + getInstance()
 *   → poori app mein EK hi WindowManager
 *   → export const windowManager = WindowManager.getInstance()
 *
 *   windows: Map<string, BrowserWindow>
 *   → key 'main' = main app window
 *   → baad mein 'settings', 'about' jaise keys add kar sakte ho
 *
 * -----------------------------------------------------------------------------
 * createMainWindow() — step by step
 * -----------------------------------------------------------------------------
 *
 *   1. Agar 'main' pehle se open hai → focus karke return (duplicate mat banao)
 *   2. config + preload path (out/preload/index.js) lo
 *   3. new BrowserWindow({ ...getMainWindowOptions(preload), title })
 *      - size / security options → windows/main-window.ts se aate hain
 *      - preload yahi attach hota hai (window.electron bridge)
 *   4. ready-to-show → window.show() (blank flash kam)
 *   5. External links → system browser (shell.openExternal), Electron window deny
 *   6. Dev: Vite URL load | Prod: out/renderer/index.html
 *   7. enableDevTools flag true ho to DevTools open
 *   8. Map mein 'main' store; closed pe Map se delete
 *
 * -----------------------------------------------------------------------------
 * BAQI METHODS
 * -----------------------------------------------------------------------------
 *
 *   getMainWindow()  → current main window ya null
 *   getAllWindows()  → saari live (non-destroyed) windows
 *   closeAll()       → sab band karo
 *
 * -----------------------------------------------------------------------------
 * USAGES (kahan se call hota hai)
 * -----------------------------------------------------------------------------
 *
 *   1. bootstrap/index.ts
 *      await app.whenReady() ke baad:
 *        windowManager.createMainWindow()
 *      → App start pe pehli baar main UI window kholna
 *
 *   2. events/index.ts → registerAppEvents() → app.on('activate')
 *      Agar koi window nahi (macOS dock click):
 *        windowManager.createMainWindow()
 *      → Last window band hone ke baad app dubara kholna
 *
 *   Export path:
 *     managers/index.ts → export { windowManager }
 *     → bootstrap / events import: import { windowManager } from '@main/managers'
 *
 * -----------------------------------------------------------------------------
 * windows/ vs managers/
 * -----------------------------------------------------------------------------
 *
 *   windows/main-window.ts  → window CONFIG (size, preload, security flags)
 *   managers/window-manager.ts → window LIFECYCLE (create, track, focus, close)
 *
 * -----------------------------------------------------------------------------
 * SIMPLE FLOW
 * -----------------------------------------------------------------------------
 *
 *   bootstrap / events
 *         │
 *         ▼
 *   windowManager.createMainWindow()
 *         │
 *         ├─ BrowserWindow create
 *         ├─ preload attach
 *         ├─ React UI load
 *         └─ Map mein track ('main')
 */

import type { BrowserWindowConstructorOptions } from 'electron'
import { join } from 'path'
import { WINDOW_DEFAULTS } from '@shared/constants'

export function getMainWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: WINDOW_DEFAULTS.WIDTH,
    height: WINDOW_DEFAULTS.HEIGHT,
    minWidth: WINDOW_DEFAULTS.MIN_WIDTH,
    minHeight: WINDOW_DEFAULTS.MIN_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  }
}

export function getRendererUrl(): string | null {
  return process.env['ELECTRON_RENDERER_URL'] ?? null
}

export function getRendererPath(): string {
  return join(__dirname, '../renderer/index.html')
}

/*
 * =============================================================================
 * MAIN WINDOW — Window CONFIG / blueprint (size, security, paths)
 * =============================================================================
 *
 * Yeh file BrowserWindow BANATI nahi.
 * Sirf options aur paths DETI hai jo WindowManager use karta hai.
 *
 *   windows/main-window.ts      →  KAISA window (config / blueprint)
 *   managers/window-manager.ts  →  KAB / KAISE create, focus, track, close
 *
 * Analogy: yeh house plan; WindowManager builder hai.
 *
 * -----------------------------------------------------------------------------
 * getMainWindowOptions(preloadPath)
 * -----------------------------------------------------------------------------
 *
 *   Return: BrowserWindowConstructorOptions object
 *   Usage:  new BrowserWindow({ ...getMainWindowOptions(preloadPath), title })
 *
 *   Options:
 *     width / height / minWidth / minHeight
 *       → shared WINDOW_DEFAULTS se (1200×800, min 900×600)
 *
 *     show: false
 *       → pehle hide; content ready hone pe manager window.show() karega
 *       → blank white flash kam
 *
 *     autoHideMenuBar: true
 *       → native menu bar auto hide (cleaner desktop UI)
 *
 *     webPreferences.preload
 *       → preload script path (out/preload/index.js)
 *       → yahi window.electron bridge load karta hai
 *
 *     webPreferences.sandbox: true
 *       → renderer extra limited / safer
 *
 *     webPreferences.contextIsolation: true
 *       → preload aur page alag worlds (security)
 *
 *     webPreferences.nodeIntegration: false
 *       → React/UI directly Node / require use NAHI kar sakta
 *       → sirf preload ke through safe API
 *
 *   Security trio (sandbox + contextIsolation + nodeIntegration:false)
 *   → UI se filesystem / OS protect; controlled bridge via preload
 *
 * -----------------------------------------------------------------------------
 * getRendererUrl()
 * -----------------------------------------------------------------------------
 *
 *   Dev Vite server URL: process.env.ELECTRON_RENDERER_URL (ya null)
 *   Example: http://localhost:5173
 *   Helper clarity / reuse ke liye; manager abhi env seedha bhi padh sakta hai
 *
 * -----------------------------------------------------------------------------
 * getRendererPath()
 * -----------------------------------------------------------------------------
 *
 *   Production built UI path: out/renderer/index.html
 *   WindowManager prod mein: window.loadFile(getRendererPath())
 *
 * -----------------------------------------------------------------------------
 * KAUN USE KARTA HAI
 * -----------------------------------------------------------------------------
 *
 *   managers/window-manager.ts → createMainWindow():
 *     const window = new BrowserWindow({
 *       ...getMainWindowOptions(preloadPath),
 *       title: config.name
 *     })
 *     // ...
 *     window.loadFile(getRendererPath())   // prod
 *
 *   Export: windows/index.ts → @main/windows
 *
 * -----------------------------------------------------------------------------
 * DEV vs PROD LOAD (manager decide karta hai)
 * -----------------------------------------------------------------------------
 *
 *   Dev  → loadURL(ELECTRON_RENDERER_URL)   // Vite HMR
 *   Prod → loadFile(getRendererPath())      // built HTML
 *
 * Yeh file paths/options deti hai; load decision WindowManager mein hai.
 */


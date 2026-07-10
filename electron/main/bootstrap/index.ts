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

/*
 * =============================================================================
 * BOOTSTRAP — App startup checklist (yeh file main/index.ts se call hoti hai)
 * =============================================================================
 *
 * Poora flow: config → identity → listeners → IPC → wait for Electron → security → window
 *
 * -----------------------------------------------------------------------------
 * IMPORTS
 * -----------------------------------------------------------------------------
 *
 * app      — Electron application control (ready hone ka wait, quit, etc.)
 * session  — Browser session; yahan CSP security headers inject karte hain
 *
 * electronApp              — @electron-toolkit/utils helper (Windows taskbar / notifications)
 * configManager            — App settings: dev/prod, platform, feature flags
 * windowManager            — BrowserWindow create & manage karta hai
 * registerAllIpc           — Saare ipcMain.handle() handlers register (preload requests sunne ke liye)
 * registerAppEvents        — OS/app events: shortcuts, macOS dock activate, etc.
 * registerLifecycleEvents  — App lifecycle: saari windows band → quit (Windows/Linux)
 * getContentSecurityPolicy — CSP rules (XSS protection — kahan se script/style load ho sakti hai)
 *
 * -----------------------------------------------------------------------------
 * bootstrap() — LINE BY LINE
 * -----------------------------------------------------------------------------
 *
 * 1. configManager.get()
 *    App ki settings ek baar load karo (environment, isPackaged, featureFlags).
 *    Baaki steps inhi flags ko use karte hain (e.g. DevTools on/off).
 *
 * 2. electronApp.setAppUserModelId(...)
 *    Windows ko app ki unique ID deta hai (taskbar grouping, notifications).
 *    - Production build  → 'com.edacleaner.app'
 *    - Dev mode          → 'com.edacleaner.dev'
 *
 * 3. registerAppEvents()
 *    Event listeners register (abhi fire nahi hote — sirf "jab X ho to Y karo" rules lagte hain).
 *    Example: naya window bana → keyboard shortcuts enable; macOS dock click → window kholo.
 *
 * 4. registerLifecycleEvents()
 *    App band hone / windows band hone ke rules.
 *    Example: last window close → Windows/Linux pe app.quit(); macOS pe app background mein reh sakta hai.
 *
 * 5. registerAllIpc()
 *    Preload se aane wale saare IPC channels ke handlers register.
 *    Window khulne se PEHLE hona chahiye — warna UI call kare aur koi handler na mile.
 *    Example: ipcMain.handle('app:get-version', ...) → appService.getVersion()
 *
 * 6. await app.whenReady()
 *    Electron internally initialize hone do — iske BINA window create unreliable ho sakta hai.
 *    async/await isliye: ready hone tak wait, phir next steps.
 *
 * 7. session.defaultSession.webRequest.onHeadersReceived(...)
 *    Har HTTP response pe Content-Security-Policy header inject karta hai.
 *    CSP = rules ki UI kahan se script, style, images load kar sakti hai (XSS se bachav).
 *    Dev: localhost + Vite HMR (ws://) allow; Prod: zyada strict rules.
 *
 * 8. windowManager.createMainWindow()
 *    Main UI window banata hai:
 *    - Size, preload path (out/preload/index.js), security flags
 *    - Dev: Vite URL load | Prod: out/renderer/index.html
 *    - DevTools agar config.featureFlags.enableDevTools true ho
 *    Iske baad user ko React UI dikhta hai.
 *
 * -----------------------------------------------------------------------------
 * ORDER KYUN IMPORTANT HAI
 * -----------------------------------------------------------------------------
 *
 *   Config + listeners + IPC  →  pehle backend ready
 *   await app.whenReady()     →  Electron ready
 *   CSP                       →  security before content loads
 *   createMainWindow()        →  UI sabse last
 *
 * Galat order (e.g. window pehle, IPC baad) → UI API call kare, handler missing → silent fail / errors.
 *
 * -----------------------------------------------------------------------------
 * SIMPLE ANALOGY
 * -----------------------------------------------------------------------------
 *
 *   Restaurant khulna:
 *   1. Settings check (config)
 *   2. Signboard laga (app ID)
 *   3. Staff rules suno (events)
 *   4. Kitchen menu ready (IPC handlers)
 *   5. "Open" sign on (whenReady)
 *   6. Security cameras (CSP)
 *   7. Customers andar (window / UI)
 */

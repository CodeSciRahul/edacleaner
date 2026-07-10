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

/*
 * =============================================================================
 * EVENTS — Electron / OS lifecycle listeners (bootstrap se register hote hain)
 * =============================================================================
 *
 * Yeh file "jab X ho to Y karo" rules define karti hai.
 * Listeners yahan REGISTER hote hain; actual events baad mein fire hote hain jab user/OS kuch kare.
 *
 * bootstrap() mein order:
 *   registerAppEvents()        → pehle (shortcuts, macOS activate)
 *   registerLifecycleEvents()  → phir (app quit rules)
 *
 * -----------------------------------------------------------------------------
 * IMPORTS
 * -----------------------------------------------------------------------------
 *
 * app            — Electron app object; app.on('event-name', handler) se listeners lagate hain
 * BrowserWindow  — activate handler mein check: koi window open hai ya nahi
 * optimizer      — @electron-toolkit/utils; dev shortcuts (F12 DevTools, etc.) enable karta hai
 * windowManager  — naya main window banane ke liye (activate pe dubara khulne ke liye)
 *
 * -----------------------------------------------------------------------------
 * registerAppEvents() — App / window behavior
 * -----------------------------------------------------------------------------
 *
 * 1. app.on('browser-window-created', ...)
 *
 *    KAB fire hota hai: Jab bhi koi naya BrowserWindow create hota hai (pehli baar ya dubara).
 *
 *    KYA karta hai:
 *      optimizer.watchWindowShortcuts(window)
 *      → Us window pe keyboard shortcuts enable:
 *         - Dev mode mein F12 → DevTools toggle
 *         - Ctrl/Cmd+R → reload (platform ke hisaab se)
 *         - etc. (@electron-toolkit/utils defaults)
 *
 *    KYUN: Har nayi window ko same shortcut behavior chahiye; manually har jagah likhne ki zaroorat nahi.
 *
 * 2. app.on('activate', ...)
 *
 *    KAB fire hota hai: Mostly macOS — user dock icon pe click karta hai jab koi window open nahi.
 *    (Windows/Linux pe bhi kabhi-kabhi; pattern macOS ke liye important hai.)
 *
 *    KYA karta hai:
 *      Agar BrowserWindow.getAllWindows().length === 0 (koi window nahi)
 *        → windowManager.createMainWindow() — app dubara khul jati hai
 *
 *    KYUN: macOS pe last window band karne se app quit NAHI hoti (neeche lifecycle dekho).
 *         User dock se wapas app khol sakta hai — activate pe nayi window chahiye.
 *
 * -----------------------------------------------------------------------------
 * registerLifecycleEvents() — App band hone ke rules
 * -----------------------------------------------------------------------------
 *
 * app.on('window-all-closed', ...)
 *
 *    KAB fire hota hai: Jab user ne SAARI BrowserWindow band kar di (last window close).
 *
 *    KYA karta hai:
 *      if (process.platform !== 'darwin')  →  Windows / Linux pe app.quit()
 *      macOS ('darwin') pe                  →  kuch nahi — app background mein chalti rehti hai
 *
 *    KYUN platform difference:
 *      - Windows/Linux: last window band = app band (expected desktop behavior)
 *      - macOS: Apple HIG — app menu bar mein rehti hai jab tak user Cmd+Q na kare;
 *               isliye window-all-closed pe quit nahi karte; activate pe nayi window (upar wala handler)
 *
 * -----------------------------------------------------------------------------
 * FLOW EXAMPLES
 * -----------------------------------------------------------------------------
 *
 *   Windows user — X pe click, last window band:
 *     window-all-closed → darwin nahi → app.quit() → process exit
 *
 *   macOS user — last window band:
 *     window-all-closed → darwin hai → quit NAHI
 *     User dock pe click → activate → koi window nahi → createMainWindow() → UI wapas
 *
 *   Koi bhi nayi window create (bootstrap ya activate se):
 *     browser-window-created → watchWindowShortcuts → shortcuts ready
 *
 * -----------------------------------------------------------------------------
 * YEH FILE KYA NAHI KARTI
 * -----------------------------------------------------------------------------
 *
 *   - IPC handlers (wo ipc/ mein hain)
 *   - Window size / preload (wo windows/ + managers/ mein hain)
 *   - React / renderer events (wo renderer/ mein hain)
 *
 * Sirf Electron app + OS level events handle karti hai.
 */

#!/usr/bin/env node
/**
 * Launch electron-vite with a clean Electron env.
 *
 * Cursor (and other Electron hosts) inject ELECTRON_RUN_AS_NODE=1 into
 * integrated terminals. If that leaks into the child Electron process it
 * either runs as plain Node or hard-crashes Chromium (FATAL NOTREACHED).
 */
import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const electronViteCli = resolve(root, 'node_modules/electron-vite/bin/electron-vite.js')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
delete env.ELECTRON_EXEC_PATH
// electron-vite otherwise launches Electron with ".". An absolute entry keeps
// the app target unambiguous even when npm/Cursor changes the child cwd.
env.ELECTRON_ENTRY = root

const child = spawn(process.execPath, [electronViteCli, 'dev', ...process.argv.slice(2)], {
  cwd: root,
  env,
  stdio: 'inherit'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

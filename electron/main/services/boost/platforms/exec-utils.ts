import { execFile } from 'child_process'
import { promisify } from 'util'
import { createLogger } from '@main/utils/logger'

const execFileAsync = promisify(execFile)
const log = createLogger('boost:exec')

export async function runCommand(
  file: string,
  args: string[],
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<{ stdout: string; stderr: string }> {
  if (options?.signal?.aborted) {
    throw new Error('Operation cancelled')
  }

  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      windowsHide: true,
      timeout: options?.timeoutMs ?? 30_000,
      maxBuffer: 2 * 1024 * 1024,
      signal: options?.signal
    })
    return { stdout: stdout.toString(), stderr: stderr.toString() }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.debug('Command failed', file, message)
    throw err
  }
}

/** Names / patterns we never suggest terminating. */
export const PROTECTED_PROCESS_NAMES = new Set(
  [
    // Windows
    'system',
    'registry',
    'smss',
    'csrss',
    'wininit',
    'services',
    'lsass',
    'svchost',
    'winlogon',
    'dwm',
    'explorer',
    'fontdrvhost',
    'sihost',
    'taskhostw',
    'runtimebroker',
    'searchhost',
    'startmenuexperiencehost',
    'shellexperiencehost',
    'securityhealthservice',
    'msmpeng',
    // macOS
    'kernel_task',
    'launchd',
    'WindowServer',
    'loginwindow',
    'Finder',
    'Dock',
    'SystemUIServer',
    'cfprefsd',
    // Linux
    'systemd',
    'init',
    'kthreadd',
    'ksoftirqd',
    'migration',
    'rcu_sched',
    'dbus-daemon',
    'NetworkManager',
    // Electron / this cleaner (basename without extension)
    'electron',
    'eda cleaner',
    'eda-cleaner',
    'edacleaner',
    'eda_cleaner',
    // Development runtimes & build tools (never terminate dev servers or build pipelines)
    'node',
    'npm',
    'npx',
    'pnpm',
    'yarn',
    'bun',
    'deno',
    'vite',
    'electron-vite',
    'esbuild',
    'git',
    // Shells & Terminals
    'zsh',
    'bash',
    'sh',
    'fish',
    'terminal',
    'iterm2',
    'warp',
    // Code editors & IDEs
    'code',
    'cursor',
    'antigravity',
    'antigravity ide'
  ].map((n) => n.toLowerCase())
)

function normalizeProcessBaseName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name
  return base.replace(/\.(exe|bin)$/i, '').toLowerCase()
}

/** Substrings that identify this app. Never use a bare "/" or a drive root. */
const SELF_APP_PATH_MARKERS = ['edacleaner', 'eda cleaner', 'eda-cleaner', 'eda_cleaner']

function pathContainsSelfApp(value: string): boolean {
  const normalized = value.replace(/\\/g, '/').toLowerCase()
  return SELF_APP_PATH_MARKERS.some((marker) => normalized.includes(marker))
}

/**
 * Finder-launched macOS builds report cwd as "/". Windows GUI launches can report
 * "C:\". Those hints match every absolute process path and mark every background
 * app as this cleaner, which also hides the Boost "stop background apps" prompt.
 */
function isSpecificPathHint(hint: string): boolean {
  const normalized = hint.replace(/\\/g, '/').replace(/\/+$/, '').trim().toLowerCase()
  if (!normalized || normalized === '/' || normalized === '.' || normalized === '..') {
    return false
  }
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length < 2) return false
  if (/^[a-z]:$/.test(segments[0]) && segments.length < 3) return false
  return true
}

function selfAppPathHints(): string[] {
  const hints = [...SELF_APP_PATH_MARKERS]
  const candidates: string[] = []
  try {
    if (typeof process !== 'undefined') {
      if (process.execPath) candidates.push(process.execPath)
      // Packaged apps launched from Finder/Explorer have a root cwd. Only trust
      // cwd when it is clearly this repo or app bundle.
      if (typeof process.cwd === 'function') {
        const cwd = process.cwd()
        if (pathContainsSelfApp(cwd)) candidates.push(cwd)
      }
    }
    // Lazy require — unit tests / non-Electron contexts may not have app ready
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app && typeof app.getPath === 'function') {
      try {
        candidates.push(app.getPath('exe'))
      } catch {
        // ignore
      }
    }
    if (app && typeof app.getAppPath === 'function') {
      try {
        const appPath = app.getAppPath()
        if (pathContainsSelfApp(appPath)) candidates.push(appPath)
      } catch {
        // ignore
      }
    }
  } catch {
    // electron unavailable
  }

  for (const candidate of candidates) {
    if (isSpecificPathHint(candidate)) hints.push(candidate.toLowerCase())
  }
  return hints
}

let cachedAncestorPids: Set<number> | null = null

function getAncestorProcessIds(): Set<number> {
  if (cachedAncestorPids) return cachedAncestorPids
  const ancestors = new Set<number>()

  if (typeof process !== 'undefined') {
    if (process.ppid && process.ppid > 1) {
      ancestors.add(process.ppid)
    }

    if (process.platform === 'darwin' || process.platform === 'linux') {
      let current = process.pid
      while (current > 1) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { execSync } = require('child_process') as typeof import('child_process')
          const out = execSync(`ps -o ppid= -p ${current}`, {
            encoding: 'utf8',
            timeout: 1000
          }).trim()
          const ppid = parseInt(out, 10)
          if (!ppid || ppid <= 1 || ancestors.has(ppid)) break
          ancestors.add(ppid)
          current = ppid
        } catch {
          break
        }
      }
    }
  }

  cachedAncestorPids = ancestors
  return ancestors
}

/**
 * Collect all PIDs belonging to this application (main process, renderers, GPU, workers, ancestors).
 */
export function getSelfProcessIds(): Set<number> {
  const pids = new Set<number>()
  if (typeof process !== 'undefined' && process.pid) {
    pids.add(process.pid)
  }
  for (const pid of getAncestorProcessIds()) {
    pids.add(pid)
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    if (app && typeof app.getAppMetrics === 'function') {
      const metrics = app.getAppMetrics()
      for (const m of metrics) {
        if (m.pid) pids.add(m.pid)
      }
    }
  } catch {
    // electron unavailable
  }
  return pids
}

/**
 * True for EDA Cleaner / Electron runtime processes that must never be stopped
 * from inside the cleaner UI.
 */
export function isSelfCleanerProcess(
  name: string,
  pid: number,
  exePath?: string
): boolean {
  if (pid === process.pid) return true
  if (getSelfProcessIds().has(pid)) return true

  const nameLower = name.toLowerCase()
  const base = normalizeProcessBaseName(name)
  if (
    base === 'electron' ||
    base.startsWith('electron-') ||
    base.startsWith('electron ') ||
    nameLower.includes('electron') ||
    nameLower.includes('edacleaner') ||
    nameLower.includes('eda cleaner') ||
    nameLower.includes('eda-cleaner') ||
    nameLower.includes('eda_cleaner') ||
    (nameLower.includes('eda') && nameLower.includes('clean')) ||
    base === 'eda' ||
    base === 'node' ||
    base === 'vite' ||
    base === 'npm' ||
    base === 'electron-vite'
  ) {
    return true
  }

  const pathLower = (exePath ?? '').toLowerCase().replace(/\\/g, '/')
  if (pathLower) {
    for (const hint of selfAppPathHints()) {
      const normalizedHint = hint.replace(/\\/g, '/')
      if (normalizedHint && pathLower.includes(normalizedHint)) return true
    }

    if (
      pathLower.includes('edacleaner') ||
      pathLower.includes('eda cleaner') ||
      pathLower.includes('eda-cleaner') ||
      pathLower.includes('eda_cleaner')
    ) {
      return true
    }

    // Dev: electron binary running this repo
    if (
      pathLower.includes('electron') &&
      (pathLower.includes('edacleaner') ||
        pathLower.includes('eda-cleaner') ||
        pathLower.includes('eda_cleaner'))
    ) {
      return true
    }
  }

  return false
}

export function isProtectedProcess(
  name: string,
  pid: number,
  exePath?: string
): boolean {
  if (pid === process.pid || pid === 0 || pid === 4) return true
  if (getSelfProcessIds().has(pid)) return true
  if (isSelfCleanerProcess(name, pid, exePath)) return true

  const base = normalizeProcessBaseName(name)
  if (PROTECTED_PROCESS_NAMES.has(base)) return true

  return false
}

export function classifyStartupImpact(name: string): 'high' | 'medium' | 'low' | 'unknown' {
  const lower = name.toLowerCase()
  const high = ['spotify', 'discord', 'steam', 'adobe', 'teams', 'zoom', 'slack', 'epic']
  const medium = ['onedrive', 'dropbox', 'chrome', 'edge', 'firefox', 'skype']
  if (high.some((k) => lower.includes(k))) return 'high'
  if (medium.some((k) => lower.includes(k))) return 'medium'
  return 'unknown'
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** True when the OS still has a live process for this PID. */
export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code
    // EPERM means it exists but we cannot signal it
    return code === 'EPERM'
  }
}

function errnoCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as NodeJS.ErrnoException).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

/**
 * Stop Unix processes with Node signals (no shell `kill` binary).
 * Sends SIGTERM, then escalates to SIGKILL if the process is still alive.
 */
export async function terminateUnixProcesses(
  pids: number[],
  signal?: AbortSignal
): Promise<{
  terminated: number
  failed: Array<{ pid: number; error: string }>
  detail: string
}> {
  const failed: Array<{ pid: number; error: string }> = []
  let terminated = 0

  for (const pid of pids) {
    if (signal?.aborted) break

    if (pid === process.pid || pid <= 1) {
      failed.push({ pid, error: 'Protected process' })
      continue
    }

    if (!isProcessAlive(pid)) {
      // Already gone — count as success for the user action
      terminated += 1
      continue
    }

    try {
      process.kill(pid, 'SIGTERM')
    } catch (err) {
      const code = errnoCode(err)
      if (code === 'ESRCH') {
        terminated += 1
        continue
      }
      if (code === 'EPERM') {
        failed.push({ pid, error: 'Permission denied' })
        continue
      }
      failed.push({
        pid,
        error: err instanceof Error ? err.message : 'Failed to signal process'
      })
      continue
    }

    await sleep(450)
    if (signal?.aborted) break

    if (!isProcessAlive(pid)) {
      terminated += 1
      continue
    }

    // Escalate — many desktop apps ignore SIGTERM
    try {
      process.kill(pid, 'SIGKILL')
    } catch (err) {
      const code = errnoCode(err)
      if (code === 'ESRCH') {
        terminated += 1
        continue
      }
      if (code === 'EPERM') {
        failed.push({ pid, error: 'Permission denied' })
        continue
      }
      failed.push({
        pid,
        error: err instanceof Error ? err.message : 'Failed to force-stop process'
      })
      continue
    }

    await sleep(250)

    if (!isProcessAlive(pid)) {
      terminated += 1
    } else {
      failed.push({ pid, error: 'Process did not exit after SIGKILL' })
    }
  }

  return {
    terminated,
    failed,
    detail:
      terminated > 0
        ? `Stopped ${terminated} process(es)`
        : failed.length > 0
          ? 'Could not stop the selected process(es)'
          : 'No processes were stopped'
  }
}

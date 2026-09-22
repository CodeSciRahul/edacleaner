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
    'smss.exe',
    'csrss.exe',
    'wininit.exe',
    'services.exe',
    'lsass.exe',
    'svchost.exe',
    'winlogon.exe',
    'dwm.exe',
    'explorer.exe',
    'fontdrvhost.exe',
    'sihost.exe',
    'taskhostw.exe',
    'runtimebroker.exe',
    'searchhost.exe',
    'startmenuexperiencehost.exe',
    'shellexperiencehost.exe',
    'securityhealthservice.exe',
    'msmpeng.exe',
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
    // Electron / self
    'electron',
    'eda cleaner',
    'eda-cleaner'
  ].map((n) => n.toLowerCase())
)

export function isProtectedProcess(name: string, pid: number): boolean {
  if (pid === process.pid || pid === 0 || pid === 4) return true
  const base = name.split(/[/\\]/).pop()?.toLowerCase() ?? name.toLowerCase()
  if (PROTECTED_PROCESS_NAMES.has(base)) return true
  // Protect our own app variants
  if (base.includes('eda') && base.includes('clean')) return true
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

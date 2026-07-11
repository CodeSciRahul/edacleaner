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

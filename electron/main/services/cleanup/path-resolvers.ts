import { access } from 'fs/promises'
import { homedir } from 'os'
import { join } from 'path'

export async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const p of paths) {
    const key = p.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(p)
  }
  return result
}

export async function filterExisting(paths: string[]): Promise<string[]> {
  const existing: string[] = []
  for (const p of uniquePaths(paths)) {
    if (await pathExists(p)) existing.push(p)
  }
  return existing
}

/** Known-safe junk / debris locations per platform (never user Documents). */
export async function resolveJunkDirectories(): Promise<string[]> {
  const home = homedir()
  const platform = process.platform

  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
    return filterExisting([
      join(local, 'Microsoft', 'Windows', 'WER', 'ReportQueue'),
      join(local, 'Microsoft', 'Windows', 'WER', 'ReportArchive'),
      join(local, 'CrashDumps'),
      join(local, 'Temp', 'WinGet')
    ])
  }

  if (platform === 'darwin') {
    return filterExisting([
      join(home, 'Library', 'Logs'),
      join(home, 'Library', 'Logs', 'DiagnosticReports'),
      join('/Library', 'Logs', 'DiagnosticReports')
    ])
  }

  // Linux — avoid Trash (recycle) and thumbnails (system)
  return filterExisting([
    join(home, '.cache', 'pip'),
    join(home, '.npm', '_logs'),
    join(home, '.cache', 'yarn')
  ])
}

/** System caches that are safe-ish but warrant a "review" badge. */
export async function resolveSystemCacheDirectories(): Promise<string[]> {
  const home = homedir()
  const platform = process.platform

  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
    const win = process.env.SystemRoot ?? 'C:\\Windows'
    return filterExisting([
      join(local, 'Microsoft', 'Windows', 'INetCache'),
      join(local, 'Microsoft', 'Windows', 'Explorer'),
      join(win, 'SoftwareDistribution', 'Download')
    ])
  }

  if (platform === 'darwin') {
    return filterExisting([
      join(home, 'Library', 'Caches', 'com.apple.Safari'),
      join(home, 'Library', 'Caches', 'CloudKit'),
      join(home, 'Library', 'Caches', 'com.apple.QuickLook.thumbnailcache')
    ])
  }

  return filterExisting([
    join(home, '.cache', 'thumbnails'),
    join(home, '.cache', 'fontconfig')
  ])
}

/** Browser cache directories (subset of boost cache dirs + extras). */
export async function resolveBrowserCacheDirectories(
  adapterCacheDirs: string[]
): Promise<string[]> {
  const home = homedir()
  const platform = process.platform
  const extras: string[] = []

  if (platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
    extras.push(
      join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
      join(local, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
      join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
      join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
      join(local, 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Cache')
    )
  } else if (platform === 'darwin') {
    extras.push(
      join(home, 'Library', 'Caches', 'Google', 'Chrome'),
      join(home, 'Library', 'Caches', 'Microsoft Edge'),
      join(home, 'Library', 'Caches', 'Firefox'),
      join(home, 'Library', 'Caches', 'com.apple.Safari')
    )
  } else {
    extras.push(
      join(home, '.cache', 'google-chrome'),
      join(home, '.cache', 'chromium'),
      join(home, '.cache', 'mozilla', 'firefox'),
      join(home, '.cache', 'msedge')
    )
  }

  // Prefer browser-looking paths; never include broad profile roots
  const merged = uniquePaths([...adapterCacheDirs, ...extras])
  const browserLike = merged.filter((p) => {
    const lower = p.toLowerCase()
    if (lower.includes('profiles') && !lower.includes('cache')) return false
    return (
      lower.includes('chrome') ||
      lower.includes('edge') ||
      lower.includes('firefox') ||
      lower.includes('mozilla') ||
      lower.includes('chromium') ||
      lower.includes('safari') ||
      lower.includes('brave')
    )
  })

  return filterExisting(browserLike.length > 0 ? browserLike : merged)
}

export function isBroadCacheRoot(dir: string): boolean {
  const base = dir.replace(/[/\\]+$/, '').toLowerCase()
  if (base.endsWith('/.cache') || base.endsWith('\\temp')) return true
  if (/[/\\]caches$/i.test(dir)) return true
  if (process.platform === 'darwin' && /Library[/\\]Caches$/i.test(dir)) return true
  return false
}

/** Locked / in-use file errors are expected during cleanup — not true failures. */
export function isBenignFsError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('eperm') ||
    lower.includes('operation not permitted') ||
    lower.includes('ebusy') ||
    lower.includes('resource busy') ||
    lower.includes('access is denied') ||
    lower.includes('eacces') ||
    lower.includes('locked') ||
    lower.includes('busy')
  )
}

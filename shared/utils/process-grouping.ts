import type { BoostProcessInfo } from '../interfaces'

/**
 * Extracts a normalized identity key for an app across multiple processes.
 * Handles:
 * - macOS .app bundles (/Applications/Foo.app/...)
 * - macOS helper processes ("Foo Helper", "Foo Helper (Renderer)")
 * - Windows executables ("foo.exe", "Foo.exe")
 * - Trailing .exe / .bin / .app extensions
 */
export function getAppIdentityKey(process: { name: string; path?: string }): string {
  // 1. macOS .app bundle
  if (process.path) {
    const macBundleMatch = process.path.match(/^(\/.+?\.app)(\/|$)/i)
    if (macBundleMatch) {
      return `bundle:${macBundleMatch[1].toLowerCase()}`
    }
  }

  // 2. Base executable name without directory and extension (.exe, .bin, .app)
  const rawName = process.name || (process.path ? process.path.split(/[/\\]/).pop() : '') || ''
  const baseName = rawName
    .split(/[/\\]/)
    .pop()!
    .replace(/\.(exe|bin|app)$/i, '')
    .replace(/\s+helper(\s*\([^)]*\))?$/i, '')
    .trim()
    .toLowerCase()

  return `name:${baseName || 'unknown'}`
}

/**
 * Groups raw OS processes by application so that each application
 * appears only a single time in Background Apps.
 *
 * - Sums memoryBytes across all child processes of the app
 * - Sums cpuPercent across all child processes of the app
 * - Collects all PIDs into `pids` array
 * - Selects the primary PID and clean app name
 * - Marks safeToTerminate as true ONLY if all processes are safe
 * - Preserves icons
 */
export function groupProcessesByApp(processes: BoostProcessInfo[]): BoostProcessInfo[] {
  if (!Array.isArray(processes) || processes.length === 0) {
    return []
  }

  const groups = new Map<string, BoostProcessInfo[]>()

  for (const proc of processes) {
    const key = getAppIdentityKey(proc)
    const existing = groups.get(key)
    if (existing) {
      existing.push(proc)
    } else {
      groups.set(key, [proc])
    }
  }

  const aggregated: BoostProcessInfo[] = []

  for (const group of groups.values()) {
    if (group.length === 1) {
      const single = group[0]
      aggregated.push({
        ...single,
        pids: single.pids && single.pids.length > 0 ? single.pids : [single.pid],
        processCount: single.processCount ?? 1
      })
      continue
    }

    // Sort group members by memory descending so the heaviest/main process leads
    const sorted = [...group].sort((a, b) => b.memoryBytes - a.memoryBytes)

    // Pick best name: prefer one without "Helper" if available, else primary process name
    const nonHelper = sorted.find((p) => !/\bhelper\b/i.test(p.name))
    const primary = nonHelper ?? sorted[0]

    // If on macOS app bundle, derive clean bundle name if possible
    let cleanName = primary.name
    if (primary.path) {
      const macBundleMatch = primary.path.match(/\/([^/]+?)\.app(\/|$)/i)
      if (macBundleMatch) {
        cleanName = macBundleMatch[1]
      }
    } else if (/\bhelper\b/i.test(cleanName)) {
      cleanName = cleanName.replace(/\s+helper(\s*\([^)]*\))?$/i, '').trim() || cleanName
    }

    const totalMemory = group.reduce((sum, p) => sum + (p.memoryBytes || 0), 0)
    const totalCpu = group.reduce((sum, p) => sum + (p.cpuPercent || 0), 0)
    const roundedCpu = Math.min(100, Math.round(totalCpu * 10) / 10)
    const allPids = Array.from(
      new Set(group.flatMap((p) => (p.pids && p.pids.length > 0 ? p.pids : [p.pid])))
    )

    // Only safe to terminate if EVERY process in the group is safe to terminate
    const allSafe = group.every((p) => p.safeToTerminate)

    // Best path: primary's path, or first defined path
    const path = primary.path ?? group.find((p) => p.path)?.path

    // Best icon: primary's icon, or first defined icon
    const iconDataUrl = primary.iconDataUrl ?? group.find((p) => p.iconDataUrl)?.iconDataUrl

    aggregated.push({
      pid: primary.pid,
      name: cleanName,
      memoryBytes: totalMemory,
      cpuPercent: roundedCpu,
      path,
      iconDataUrl,
      safeToTerminate: allSafe,
      pids: allPids,
      processCount: allPids.length
    })
  }

  // Sort by memory descending
  return aggregated.sort((a, b) => b.memoryBytes - a.memoryBytes)
}

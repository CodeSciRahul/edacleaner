import { app, nativeImage } from 'electron'
import type {
  StartupAppEntry,
  StartupListResult,
  StartupMutationResult,
  StartupSetEnabledOptions
} from '@shared/interfaces'
import { createLogger } from '@main/utils/logger'
import { createPlatformStartupAdapter } from './platforms/create-adapter'
import type { PlatformStartupAdapter } from './platforms/platform-adapter'

const log = createLogger('StartupService')

const CACHE_TTL_MS = 15_000

function extractIconPath(location: string): string | null {
  // Strip arguments: `"C:\Path\app.exe" /arg` or `C:\Path\app.exe /arg`
  const quoted = location.match(/^"([^"]+\.(exe|app|lnk))"/i)
  if (quoted) return quoted[1]

  const unquoted = location.match(/^([^\s"]+\.(exe|app|lnk))/i)
  if (unquoted) return unquoted[1]

  if (/\.(desktop|plist|lnk)$/i.test(location)) return location
  return null
}

async function tryGetIconDataUrl(location: string): Promise<string | undefined> {
  const iconPath = extractIconPath(location)
  if (!iconPath) return undefined

  try {
    const image = await app.getFileIcon(iconPath, { size: 'normal' })
    if (image.isEmpty()) return undefined
    return image.toDataURL()
  } catch {
    try {
      const image = nativeImage.createFromPath(iconPath)
      if (image.isEmpty()) return undefined
      return image.toDataURL()
    } catch {
      return undefined
    }
  }
}

export class StartupService {
  private readonly adapter: PlatformStartupAdapter = createPlatformStartupAdapter()
  private cache: StartupListResult | null = null
  private cacheAt = 0

  async list(options?: { forceRefresh?: boolean }): Promise<StartupListResult> {
    const force = options?.forceRefresh ?? false
    if (!force && this.cache && Date.now() - this.cacheAt < CACHE_TTL_MS) {
      return this.cache
    }

    log.info('Listing startup applications', this.adapter.platformId)
    const warnings: string[] = []

    if (this.adapter.platformId === 'unsupported') {
      warnings.push('Startup management is not available on this operating system.')
    }

    let entries: StartupAppEntry[] = []
    try {
      entries = await this.adapter.listEntries()
    } catch (err) {
      log.error('Failed to list startup entries', err)
      warnings.push(err instanceof Error ? err.message : 'Failed to list startup apps')
    }

    // Enrich icons asynchronously with a small concurrency limit
    const enriched = await this.enrichIcons(entries)

    const result: StartupListResult = {
      entries: enriched.sort((a, b) => a.name.localeCompare(b.name)),
      platform: this.adapter.platformId,
      warnings,
      generatedAt: Date.now()
    }

    this.cache = result
    this.cacheAt = Date.now()
    return result
  }

  async getDetails(id: string): Promise<StartupAppEntry | null> {
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('Invalid startup entry id')
    }
    const list = await this.list()
    return list.entries.find((e) => e.id === id) ?? null
  }

  async setEnabled(options: StartupSetEnabledOptions): Promise<StartupMutationResult> {
    const { id, enabled } = options

    if (typeof id !== 'string' || !id.trim()) {
      return { success: false, error: 'Invalid startup entry id' }
    }
    if (typeof enabled !== 'boolean') {
      return { success: false, error: 'Invalid enabled flag' }
    }

    const current = await this.getDetails(id)
    if (!current) {
      return { success: false, error: 'Startup entry not found. Refresh and try again.' }
    }
    if (!current.canToggle) {
      return {
        success: false,
        error: current.protectedReason ?? 'This startup entry cannot be modified'
      }
    }
    if (current.enabled === enabled) {
      return { success: true, entry: current }
    }

    log.info('Toggling startup entry', { id, enabled, name: current.name })
    const result = await this.adapter.setEnabled(id, enabled)

    // Invalidate cache so UI refresh sees latest state
    this.cache = null
    this.cacheAt = 0

    if (result.success && result.entry && !result.entry.iconDataUrl) {
      result.entry.iconDataUrl = await tryGetIconDataUrl(result.entry.location)
    }

    return result
  }

  private async enrichIcons(entries: StartupAppEntry[]): Promise<StartupAppEntry[]> {
    const result: StartupAppEntry[] = []
    const batchSize = 4

    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize)
      const withIcons = await Promise.all(
        batch.map(async (entry) => {
          const iconDataUrl = await tryGetIconDataUrl(entry.location)
          return iconDataUrl ? { ...entry, iconDataUrl } : entry
        })
      )
      result.push(...withIcons)
      // Yield so IPC stays responsive while icons load
      await new Promise((r) => setImmediate(r))
    }

    return result
  }
}

export const startupService = new StartupService()

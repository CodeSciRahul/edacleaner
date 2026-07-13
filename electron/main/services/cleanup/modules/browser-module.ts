import { createDirectoryCleanupModule } from './directory-module'
import { resolveBrowserCacheDirectories } from '../path-resolvers'
import type { CleanupModule } from './types'

export const browserModule: CleanupModule = createDirectoryCleanupModule({
  id: 'browser',
  label: 'Browser Cache',
  description: 'Cached data from Chrome, Edge, Firefox, and Safari',
  risk: 'safe',
  cleanMessage: 'Optimizing browser cache…',
  maxEstimateEntries: 2_000,
  maxCleanEntries: 5_000,
  resolvePaths: async (ctx) => {
    const adapterCaches = await ctx.adapter.getCacheDirectories()
    return resolveBrowserCacheDirectories(adapterCaches)
  }
})

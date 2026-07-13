import { createDirectoryCleanupModule } from './directory-module'
import { filterExisting, uniquePaths } from '../path-resolvers'
import type { CleanupModule } from './types'

export const tempModule: CleanupModule = createDirectoryCleanupModule({
  id: 'temp',
  label: 'Temporary Files',
  description: 'OS and application temporary folders',
  risk: 'safe',
  cleanMessage: 'Optimizing temporary files…',
  maxEstimateEntries: 2_500,
  maxCleanEntries: 8_000,
  resolvePaths: async (ctx) => {
    const platformTemps = await ctx.adapter.getTempDirectories()
    return filterExisting(uniquePaths([ctx.electronTempPath, ...platformTemps]))
  }
})

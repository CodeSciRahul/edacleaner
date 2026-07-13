import { createDirectoryCleanupModule } from './directory-module'
import { resolveSystemCacheDirectories } from '../path-resolvers'
import type { CleanupModule } from './types'

export const systemModule: CleanupModule = createDirectoryCleanupModule({
  id: 'system',
  label: 'System Cache',
  description: 'Thumbnail, update download, and system network caches',
  risk: 'review',
  cleanMessage: 'Optimizing system cache…',
  maxEstimateEntries: 2_000,
  maxCleanEntries: 4_000,
  resolvePaths: () => resolveSystemCacheDirectories()
})

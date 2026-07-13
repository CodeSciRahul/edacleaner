import { createDirectoryCleanupModule } from './directory-module'
import { resolveJunkDirectories } from '../path-resolvers'
import type { CleanupModule } from './types'

export const junkModule: CleanupModule = createDirectoryCleanupModule({
  id: 'junk',
  label: 'Junk Files',
  description: 'Leftover installers, crash dumps, and app debris',
  risk: 'safe',
  cleanMessage: 'Optimizing junk files…',
  maxEstimateEntries: 2_000,
  maxCleanEntries: 5_000,
  resolvePaths: () => resolveJunkDirectories()
})

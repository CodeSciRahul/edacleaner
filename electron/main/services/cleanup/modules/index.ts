import type { CleanupModule } from './types'
import { junkModule } from './junk-module'
import { tempModule } from './temp-module'
import { recycleModule } from './recycle-module'
import { browserModule } from './browser-module'
import { systemModule } from './system-module'

/**
 * Ordered registry of cleanup modules.
 * Append new modules here to extend the Cleanup feature without touching the orchestrator.
 */
export const cleanupModules: CleanupModule[] = [
  junkModule,
  tempModule,
  recycleModule,
  browserModule,
  systemModule
]

export function getCleanupModule(id: string): CleanupModule | undefined {
  return cleanupModules.find((m) => m.id === id)
}

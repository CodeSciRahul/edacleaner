import type { SmartScanModule } from './types'
import { cleanupScanModule } from './cleanup-module'
import { storageScanModule } from './storage-module'
import { performanceScanModule } from './performance-module'
import { securityScanModule } from './security-module'

/**
 * Ordered Smart Scan modules. Append new modules here to extend coverage.
 */
export const smartScanModules: SmartScanModule[] = [
  cleanupScanModule,
  storageScanModule,
  performanceScanModule,
  securityScanModule
]

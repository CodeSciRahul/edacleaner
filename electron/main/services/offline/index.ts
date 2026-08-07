export { databaseManager, DatabaseManager } from './database/database'
export { runMigrations } from './database/migrations'

export { BaseRepository } from './repositories/base-repository'
export { KvRepository, kvRepository } from './repositories/kv-repository'
export { CacheRepository, cacheRepository } from './repositories/cache-repository'
export {
  SecureRepository,
  secureRepository
} from './repositories/secure-repository'

export {
  LocalStorageService,
  localStorageService
} from './local-storage-service'
export {
  SecureStorageService,
  secureStorageService
} from './secure-storage-service'
export { CacheManager, cacheManager } from './cache-manager'
export {
  ConnectivityService,
  connectivityService
} from './connectivity-service'
export {
  NetworkStatusObserver,
  networkStatusObserver
} from './network-status-observer'

export {
  QueueRepository,
  queueRepository,
  QueueService,
  queueService,
  QueueProcessor,
  queueProcessor,
  QueueCleanup,
  queueCleanup
} from './queue'

export {
  SyncEngine,
  syncEngine,
  syncProgressReporter,
  resolveConflict
} from './sync'

import { databaseManager } from './database/database'
import { connectivityService } from './connectivity-service'
import { networkStatusObserver } from './network-status-observer'
import { cacheManager } from './cache-manager'
import { queueService, queueCleanup } from './queue'
import { syncEngine } from './sync'
import { createLogger } from '@main/utils/logger'
import { apiClient } from '@main/services/api'

const log = createLogger('Offline')

const MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000

let maintenanceTimer: NodeJS.Timeout | null = null
let degraded = false

/**
 * Bootstraps offline foundation + background synchronization engine.
 * Automatic recovery: interrupted queue rows, integrity/backup restore,
 * cache purge, and periodic maintenance.
 */
export async function initializeOfflineFoundation(): Promise<void> {
  degraded = false

  try {
    await databaseManager.initialize()
  } catch (error) {
    degraded = true
    log.error('Database initialization failed — offline features degraded', error)
    throw error
  }

  try {
    if (!databaseManager.checkIntegrity()) {
      log.warn('Post-migration integrity check reported issues')
    }

    cacheManager.purgeExpired()
    queueService.recoverInterrupted()
    queueCleanup.run()

    connectivityService.start()
    networkStatusObserver.start()
    syncEngine.startBackgroundSync()

    const { authSessionService } = await import('@main/services/auth')
    authSessionService.initialize()

    startMaintenanceLoop()

    log.info('Offline foundation + sync engine initialized', {
      queue: queueService.getStats(),
      degraded
    })
  } catch (error) {
    degraded = true
    log.error('Offline foundation partially failed', error)
    throw error
  }
}

export function isOfflineFoundationDegraded(): boolean {
  return degraded
}

export async function shutdownOfflineFoundation(): Promise<void> {
  log.info('Shutting down offline foundation')

  stopMaintenanceLoop()

  try {
    syncEngine.cancel()
    syncEngine.stopBackgroundSync()
  } catch (error) {
    log.warn('Sync shutdown error', error)
  }

  try {
    const { authSessionService } = await import('@main/services/auth')
    authSessionService.dispose()
  } catch (error) {
    log.warn('Auth session dispose error', error)
  }

  try {
    apiClient.setAuthHandlers(null)
  } catch {
    // ignore
  }

  try {
    networkStatusObserver.stop()
    connectivityService.stop()
  } catch (error) {
    log.warn('Connectivity shutdown error', error)
  }

  try {
    queueCleanup.run()
    cacheManager.purgeExpired()
  } catch (error) {
    log.warn('Pre-close cleanup error', error)
  }

  await databaseManager.close()
  log.info('Offline foundation shut down')
}

function startMaintenanceLoop(): void {
  if (maintenanceTimer) return
  maintenanceTimer = setInterval(() => {
    try {
      const purged = cacheManager.purgeExpired()
      const cleaned = queueCleanup.run()
      log.info('Periodic offline maintenance', {
        cachePurged: purged,
        queueDeleted: cleaned.deleted
      })
    } catch (error) {
      log.error('Periodic maintenance failed', error)
    }
  }, MAINTENANCE_INTERVAL_MS)
  maintenanceTimer.unref?.()
}

function stopMaintenanceLoop(): void {
  if (!maintenanceTimer) return
  clearInterval(maintenanceTimer)
  maintenanceTimer = null
}

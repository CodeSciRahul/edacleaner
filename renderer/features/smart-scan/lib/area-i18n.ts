import type { SmartScanAreaId, SmartScanAreaStatus } from '@shared/interfaces'
import type { TranslationKey } from '@/i18n/locales/en'

const AREA_LABEL_KEYS: Record<SmartScanAreaId, TranslationKey> = {
  cleanup: 'smartScan.area.cleanup',
  storage: 'smartScan.area.storage',
  performance: 'smartScan.area.performance',
  security: 'smartScan.area.security'
}

const AREA_DESC_KEYS: Record<SmartScanAreaId, TranslationKey> = {
  cleanup: 'smartScan.area.cleanupDesc',
  storage: 'smartScan.area.storageDesc',
  performance: 'smartScan.area.performanceDesc',
  security: 'smartScan.area.securityDesc'
}

const STATUS_LABEL_KEYS: Record<SmartScanAreaStatus, TranslationKey> = {
  good: 'smartScan.statusLabel.good',
  warning: 'smartScan.statusLabel.warning',
  issue: 'smartScan.statusLabel.issue'
}

export function smartScanAreaLabelKey(id: SmartScanAreaId): TranslationKey {
  return AREA_LABEL_KEYS[id]
}

export function smartScanAreaDescKey(id: SmartScanAreaId): TranslationKey {
  return AREA_DESC_KEYS[id]
}

export function smartScanStatusLabelKey(status: SmartScanAreaStatus): TranslationKey {
  return STATUS_LABEL_KEYS[status]
}

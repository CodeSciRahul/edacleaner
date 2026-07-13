import type { CleanupCategoryId } from '@shared/interfaces'
import type { TranslationKey } from '@/i18n/locales/en'

const CATEGORY_LABEL_KEYS: Record<CleanupCategoryId, TranslationKey> = {
  junk: 'cleanup.cat.junk',
  temp: 'cleanup.cat.temp',
  recycle: 'cleanup.cat.recycle',
  browser: 'cleanup.cat.browser',
  system: 'cleanup.cat.system'
}

const CATEGORY_DESC_KEYS: Record<CleanupCategoryId, TranslationKey> = {
  junk: 'cleanup.cat.junkDesc',
  temp: 'cleanup.cat.tempDesc',
  recycle: 'cleanup.cat.recycleDesc',
  browser: 'cleanup.cat.browserDesc',
  system: 'cleanup.cat.systemDesc'
}

export function cleanupCategoryLabelKey(id: CleanupCategoryId): TranslationKey {
  return CATEGORY_LABEL_KEYS[id]
}

export function cleanupCategoryDescKey(id: CleanupCategoryId): TranslationKey {
  return CATEGORY_DESC_KEYS[id]
}

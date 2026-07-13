import type { LucideIcon } from 'lucide-react'
import {
  Palette,
  SlidersHorizontal,
  Sparkles,
  Bell,
  Info
} from 'lucide-react'
import type { TranslationKey } from '@/i18n/locales/en'

export type SettingsCategoryId =
  | 'appearance'
  | 'general'
  | 'optimization'
  | 'notifications'
  | 'about'

export interface SettingsCategory {
  id: SettingsCategoryId
  labelKey: TranslationKey
  descriptionKey: TranslationKey
  icon: LucideIcon
}

export const settingsCategories: SettingsCategory[] = [
  {
    id: 'appearance',
    labelKey: 'settings.cat.appearance',
    descriptionKey: 'settings.cat.appearanceDesc',
    icon: Palette
  },
  {
    id: 'general',
    labelKey: 'settings.cat.general',
    descriptionKey: 'settings.cat.generalDesc',
    icon: SlidersHorizontal
  },
  {
    id: 'optimization',
    labelKey: 'settings.cat.optimization',
    descriptionKey: 'settings.cat.optimizationDesc',
    icon: Sparkles
  },
  {
    id: 'notifications',
    labelKey: 'settings.cat.notifications',
    descriptionKey: 'settings.cat.notificationsDesc',
    icon: Bell
  },
  {
    id: 'about',
    labelKey: 'settings.cat.about',
    descriptionKey: 'settings.cat.aboutDesc',
    icon: Info
  }
]

export function platformLabel(platform: string | undefined): string {
  switch (platform) {
    case 'win32':
      return 'Windows'
    case 'darwin':
      return 'macOS'
    case 'linux':
      return 'Linux'
    default:
      return platform ?? 'Unknown'
  }
}

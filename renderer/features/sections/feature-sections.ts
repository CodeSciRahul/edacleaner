import type { LucideIcon } from 'lucide-react'
import {
  Trash2,
  Clock,
  Recycle,
  Globe,
  Database,
  Copy,
  FileStack,
  PieChart,
  Power,
  Layers,
  Cpu,
  Activity
} from 'lucide-react'
import type { TranslationKey } from '@/i18n/locales/en'

export interface FeatureItem {
  id: string
  labelKey: TranslationKey
  descriptionKey: TranslationKey
  icon: LucideIcon
}

export interface FeatureSection {
  id: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
  features: FeatureItem[]
}

export const featureSections: Record<string, FeatureSection> = {
  cleanup: {
    id: 'cleanup',
    titleKey: 'feature.cleanup.title',
    descriptionKey: 'feature.cleanup.desc',
    features: [
      {
        id: 'junk-cleaner',
        labelKey: 'feature.cleanup.junk',
        descriptionKey: 'feature.cleanup.junkDesc',
        icon: Trash2
      },
      {
        id: 'temporary-files',
        labelKey: 'feature.cleanup.temp',
        descriptionKey: 'feature.cleanup.tempDesc',
        icon: Clock
      },
      {
        id: 'recycle-bin',
        labelKey: 'feature.cleanup.recycle',
        descriptionKey: 'feature.cleanup.recycleDesc',
        icon: Recycle
      },
      {
        id: 'browser-cache',
        labelKey: 'feature.cleanup.browser',
        descriptionKey: 'feature.cleanup.browserDesc',
        icon: Globe
      },
      {
        id: 'system-cache',
        labelKey: 'feature.cleanup.system',
        descriptionKey: 'feature.cleanup.systemDesc',
        icon: Database
      }
    ]
  },
  storage: {
    id: 'storage',
    titleKey: 'feature.storage.title',
    descriptionKey: 'feature.storage.desc',
    features: [
      {
        id: 'duplicate-files',
        labelKey: 'feature.storage.dupes',
        descriptionKey: 'feature.storage.dupesDesc',
        icon: Copy
      },
      {
        id: 'large-files',
        labelKey: 'feature.storage.large',
        descriptionKey: 'feature.storage.largeDesc',
        icon: FileStack
      },
      {
        id: 'disk-usage',
        labelKey: 'feature.storage.disk',
        descriptionKey: 'feature.storage.diskDesc',
        icon: PieChart
      }
    ]
  },
  performance: {
    id: 'performance',
    titleKey: 'feature.performance.title',
    descriptionKey: 'feature.performance.desc',
    features: [
      {
        id: 'startup-manager',
        labelKey: 'feature.performance.startup',
        descriptionKey: 'feature.performance.startupDesc',
        icon: Power
      },
      {
        id: 'background-apps',
        labelKey: 'feature.performance.bg',
        descriptionKey: 'feature.performance.bgDesc',
        icon: Layers
      },
      {
        id: 'memory-optimization',
        labelKey: 'feature.performance.memory',
        descriptionKey: 'feature.performance.memoryDesc',
        icon: Cpu
      },
      {
        id: 'performance-monitor',
        labelKey: 'feature.performance.monitor',
        descriptionKey: 'feature.performance.monitorDesc',
        icon: Activity
      }
    ]
  }
}

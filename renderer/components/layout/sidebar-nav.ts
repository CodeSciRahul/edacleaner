import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ScanSearch,
  Zap,
  HardDrive,
  Settings,
  Sparkles,
  BarChart3,
  Activity
} from 'lucide-react'
import type { TranslationKey } from '@/i18n/locales/en'

export interface SidebarNavItem {
  id: string
  labelKey: TranslationKey
  descriptionKey: TranslationKey
  href: string
  icon: LucideIcon
}

export const sidebarNavItems: SidebarNavItem[] = [
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    descriptionKey: 'nav.dashboardDesc',
    href: '/',
    icon: LayoutDashboard
  },
  {
    id: 'smart-scan',
    labelKey: 'nav.smartScan',
    descriptionKey: 'nav.smartScanDesc',
    href: '/smart-scan',
    icon: ScanSearch
  },
  {
    id: 'cleanup',
    labelKey: 'nav.cleanup',
    descriptionKey: 'nav.cleanupDesc',
    href: '/cleanup',
    icon: Sparkles
  },
  {
    id: 'storage',
    labelKey: 'nav.storage',
    descriptionKey: 'nav.storageDesc',
    href: '/storage',
    icon: HardDrive
  },
  {
    id: 'performance',
    labelKey: 'nav.performance',
    descriptionKey: 'nav.performanceDesc',
    href: '/performance',
    icon: Zap
  },
  {
    id: 'monitoring',
    labelKey: 'nav.monitoring',
    descriptionKey: 'nav.monitoringDesc',
    href: '/monitoring',
    icon: Activity
  },
  {
    id: 'reports',
    labelKey: 'nav.reports',
    descriptionKey: 'nav.reportsDesc',
    href: '/reports',
    icon: BarChart3
  },
  {
    id: 'settings',
    labelKey: 'nav.settings',
    descriptionKey: 'nav.settingsDesc',
    href: '/settings',
    icon: Settings
  }
]

import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ScanSearch,
  Sparkles,
  HardDrive,
  Zap,
  BarChart3,
  Settings
} from 'lucide-react'

export interface SidebarNavAccent {
  icon: string
  iconActive: string
  bar: string
}

export interface SidebarNavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  description: string
  accent: SidebarNavAccent
}

/** Neutral glass surface for active nav — fits light and dark sidebars. */
export const sidebarActiveSurface =
  'border border-black/[0.04] bg-black/[0.04] shadow-sm shadow-black/[0.04] dark:border-white/[0.06] dark:bg-white/[0.06] dark:shadow-none'

export const sidebarNavItems: SidebarNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'System overview',
    accent: {
      icon: 'text-sky-600/80 dark:text-sky-400/75',
      iconActive: 'text-sky-600 dark:text-sky-400',
      bar: 'bg-sky-500 dark:bg-sky-400'
    }
  },
  {
    id: 'smart-scan',
    label: 'Smart Scan',
    href: '/smart-scan',
    icon: ScanSearch,
    description: 'One-click health check',
    accent: {
      icon: 'text-violet-600/80 dark:text-violet-400/75',
      iconActive: 'text-violet-600 dark:text-violet-400',
      bar: 'bg-violet-500 dark:bg-violet-400'
    }
  },
  {
    id: 'cleanup',
    label: 'Cleanup',
    href: '/cleanup',
    icon: Sparkles,
    description: 'Remove junk and clutter',
    accent: {
      icon: 'text-cyan-600/80 dark:text-cyan-400/75',
      iconActive: 'text-cyan-600 dark:text-cyan-400',
      bar: 'bg-cyan-500 dark:bg-cyan-400'
    }
  },
  {
    id: 'storage',
    label: 'Storage',
    href: '/storage',
    icon: HardDrive,
    description: 'Free up disk space',
    accent: {
      icon: 'text-blue-600/80 dark:text-blue-400/75',
      iconActive: 'text-blue-600 dark:text-blue-400',
      bar: 'bg-blue-500 dark:bg-blue-400'
    }
  },
  {
    id: 'performance',
    label: 'Performance',
    href: '/performance',
    icon: Zap,
    description: 'Speed up your PC',
    accent: {
      icon: 'text-emerald-600/80 dark:text-emerald-400/75',
      iconActive: 'text-emerald-600 dark:text-emerald-400',
      bar: 'bg-emerald-500 dark:bg-emerald-400'
    }
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    description: 'History and insights',
    accent: {
      icon: 'text-indigo-600/80 dark:text-indigo-400/75',
      iconActive: 'text-indigo-600 dark:text-indigo-400',
      bar: 'bg-indigo-500 dark:bg-indigo-400'
    }
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Preferences',
    accent: {
      icon: 'text-amber-600/80 dark:text-amber-400/75',
      iconActive: 'text-amber-600 dark:text-amber-400',
      bar: 'bg-amber-500 dark:bg-amber-400'
    }
  }
]

import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ScanSearch,
  Zap,
  HardDrive,
  Settings,
  Sparkles,
  BarChart3
} from 'lucide-react'

export interface SidebarNavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  description: string
}

export const sidebarNavItems: SidebarNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'System overview and quick actions'
  },
  {
    id: 'smart-scan',
    label: 'Smart Scan',
    href: '/smart-scan',
    icon: ScanSearch,
    description: 'One-click health check'
  },
  {
    id: 'cleanup',
    label: 'Cleanup',
    href: '/cleanup',
    icon: Sparkles,
    description: 'Remove junk and clutter'
  },
  {
    id: 'storage',
    label: 'Storage',
    href: '/storage',
    icon: HardDrive,
    description: 'Free up disk space'
  },
  {
    id: 'performance',
    label: 'Performance',
    href: '/performance',
    icon: Zap,
    description: 'Speed up your PC'
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    description: 'History and insights'
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Preferences'
  }
]

import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ScanSearch,
  Trash2,
  Power,
  Zap,
  Cpu,
  Shield,
  HardDrive,
  Wifi,
  PieChart,
  Copy,
  CalendarClock,
  Settings
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
  // {
  //   id: 'junk-cleaner',
  //   label: 'Junk Cleaner',
  //   href: '/junk-cleaner',
  //   icon: Trash2,
  //   description: 'Remove system clutter'
  // },
  // {
  //   id: 'startup-manager',
  //   label: 'Startup Manager',
  //   href: '/startup-manager',
  //   icon: Power,
  //   description: 'Control startup programs'
  // },
  // {
  //   id: 'performance',
  //   label: 'Performance',
  //   href: '/performance',
  //   icon: Zap,
  //   description: 'Speed and responsiveness'
  // },
  // {
  //   id: 'memory-optimizer',
  //   label: 'Memory Optimizer',
  //   href: '/memory-optimizer',
  //   icon: Cpu,
  //   description: 'Free up RAM'
  // },
  // {
  //   id: 'privacy',
  //   label: 'Privacy',
  //   href: '/privacy',
  //   icon: Shield,
  //   description: 'Protect personal data'
  // },
  // {
  //   id: 'drivers',
  //   label: 'Drivers',
  //   href: '/drivers',
  //   icon: HardDrive,
  //   description: 'Update device drivers'
  // },
  // {
  //   id: 'network',
  //   label: 'Network',
  //   href: '/network',
  //   icon: Wifi,
  //   description: 'Network diagnostics'
  // },
  // {
  //   id: 'disk-analyzer',
  //   label: 'Disk Analyzer',
  //   href: '/disk-analyzer',
  //   icon: PieChart,
  //   description: 'Visualize disk usage'
  // },
  // {
  //   id: 'duplicate-files',
  //   label: 'Duplicate Files',
  //   href: '/duplicate-files',
  //   icon: Copy,
  //   description: 'Find duplicate files'
  // },
  // {
  //   id: 'scheduled-tasks',
  //   label: 'Scheduled Tasks',
  //   href: '/scheduled-tasks',
  //   icon: CalendarClock,
  //   description: 'Automated maintenance'
  // },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'App preferences'
  }
]

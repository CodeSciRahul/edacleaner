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

export interface FeatureItem {
  id: string
  label: string
  description: string
  icon: LucideIcon
}

export interface FeatureSection {
  id: string
  title: string
  description: string
  features: FeatureItem[]
}

export const featureSections: Record<string, FeatureSection> = {
  cleanup: {
    id: 'cleanup',
    title: 'Cleanup',
    description: 'Clear clutter and reclaim space with targeted cleaning tools.',
    features: [
      {
        id: 'junk-cleaner',
        label: 'Junk Cleaner',
        description: 'Remove leftover files and system clutter safely.',
        icon: Trash2
      },
      {
        id: 'temporary-files',
        label: 'Temporary Files',
        description: 'Delete temporary files created by apps and Windows.',
        icon: Clock
      },
      {
        id: 'recycle-bin',
        label: 'Recycle Bin',
        description: 'Empty deleted items and recover wasted space.',
        icon: Recycle
      },
      {
        id: 'browser-cache',
        label: 'Browser Cache',
        description: 'Clear cached data from popular browsers.',
        icon: Globe
      },
      {
        id: 'system-cache',
        label: 'System Cache',
        description: 'Clean system caches without affecting personal files.',
        icon: Database
      }
    ]
  },
  storage: {
    id: 'storage',
    title: 'Storage',
    description: 'Find what is using disk space and free it up intelligently.',
    features: [
      {
        id: 'duplicate-files',
        label: 'Duplicate Files',
        description: 'Locate and remove identical copies of files.',
        icon: Copy
      },
      {
        id: 'large-files',
        label: 'Large Files',
        description: 'Discover oversized files taking up valuable space.',
        icon: FileStack
      },
      {
        id: 'disk-usage',
        label: 'Disk Usage Analyzer',
        description: 'Visualize how storage is distributed across drives.',
        icon: PieChart
      }
    ]
  },
  performance: {
    id: 'performance',
    title: 'Performance',
    description: 'Optimize startup, memory, and background activity.',
    features: [
      {
        id: 'startup-manager',
        label: 'Startup Manager',
        description: 'Control apps that launch when your PC starts.',
        icon: Power
      },
      {
        id: 'background-apps',
        label: 'Background Apps',
        description: 'Limit apps running quietly in the background.',
        icon: Layers
      },
      {
        id: 'memory-optimization',
        label: 'Memory Optimization',
        description: 'Free RAM used by idle and heavy processes.',
        icon: Cpu
      },
      {
        id: 'performance-monitor',
        label: 'Performance Monitor',
        description: 'Track CPU, memory, and system responsiveness.',
        icon: Activity
      }
    ]
  }
}

import { Database, Disc3, HardDrive, HeartPulse, PieChart, type LucideIcon } from 'lucide-react'
import totalCapacityBg from '@/assets/storage/summary/total-capacity-bg.png'
import usedStorageBg from '@/assets/storage/summary/used-storage-bg.png'
import availableBg from '@/assets/storage/summary/available-bg.png'
import usageBg from '@/assets/storage/summary/usage-bg.png'
import storageHealthBg from '@/assets/storage/summary/storage-health-bg.png'

export type StorageSummaryCardId =
  | 'total'
  | 'used'
  | 'free'
  | 'percent'
  | 'health'

export interface StorageSummaryVisual {
  icon: LucideIcon
  iconWrapClass: string
  bgImage: string
}

const summaryVisuals: Record<StorageSummaryCardId, StorageSummaryVisual> = {
  total: {
    icon: Database,
    iconWrapClass: 'bg-primary/15 text-primary ring-1 ring-primary/20',
    bgImage: totalCapacityBg
  },
  used: {
    icon: Disc3,
    iconWrapClass: 'bg-chart-disk/15 text-chart-disk ring-1 ring-chart-disk/20',
    bgImage: usedStorageBg
  },
  free: {
    icon: HardDrive,
    iconWrapClass: 'bg-success/15 text-success ring-1 ring-success/20',
    bgImage: availableBg
  },
  percent: {
    icon: PieChart,
    iconWrapClass: 'bg-warning/15 text-warning ring-1 ring-warning/20',
    bgImage: usageBg
  },
  health: {
    icon: HeartPulse,
    iconWrapClass: 'bg-chart-ram/15 text-chart-ram ring-1 ring-chart-ram/20',
    bgImage: storageHealthBg
  }
}

export function getSummaryVisual(id: StorageSummaryCardId): StorageSummaryVisual {
  return summaryVisuals[id]
}

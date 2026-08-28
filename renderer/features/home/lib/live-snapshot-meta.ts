import { Cpu, HardDrive, MemoryStick, type LucideIcon } from 'lucide-react'
import cpuLoadBg from '@/assets/dashboard/live-snapshot/cpu-load-bg.png'
import ramUsageBg from '@/assets/dashboard/live-snapshot/ram-usage-bg.png'
import diskUsageBg from '@/assets/dashboard/live-snapshot/disk-usage-bg.png'
import type { MetricColor } from '@/components/desktop/CircularProgress'

export type LiveSnapshotMetricId = 'cpu' | 'ram' | 'disk'

export interface LiveSnapshotVisual {
  icon: LucideIcon
  iconWrapClass: string
  bgImage: string
  gaugeColor: MetricColor
}

const snapshotVisuals: Record<LiveSnapshotMetricId, LiveSnapshotVisual> = {
  cpu: {
    icon: Cpu,
    iconWrapClass: 'bg-primary/15 text-primary',
    bgImage: cpuLoadBg,
    gaugeColor: 'cpu'
  },
  ram: {
    icon: MemoryStick,
    iconWrapClass: 'bg-chart-ram/15 text-chart-ram',
    bgImage: ramUsageBg,
    gaugeColor: 'ram'
  },
  disk: {
    icon: HardDrive,
    iconWrapClass: 'bg-chart-disk/15 text-chart-disk',
    bgImage: diskUsageBg,
    gaugeColor: 'disk'
  }
}

export function getLiveSnapshotVisual(id: LiveSnapshotMetricId): LiveSnapshotVisual {
  return snapshotVisuals[id]
}

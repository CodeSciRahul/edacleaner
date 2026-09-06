import { Cpu, MemoryStick, type LucideIcon } from 'lucide-react'
import cpuLoadBg from '@/assets/dashboard/live-snapshot/cpu-load-bg.png'
import ramUsageBg from '@/assets/dashboard/live-snapshot/ram-usage-bg.png'
import type { MetricColor } from '@/components/desktop/CircularProgress'
import type { MetricId } from '../types'

export interface MonitoringSummaryVisual {
  icon: LucideIcon
  iconWrapClass: string
  bgImage: string
  gaugeColor: MetricColor
}

const summaryVisuals: Record<MetricId, MonitoringSummaryVisual> = {
  cpu: {
    icon: Cpu,
    iconWrapClass: 'bg-primary/15 text-primary',
    bgImage: cpuLoadBg,
    gaugeColor: 'cpu'
  },
  memory: {
    icon: MemoryStick,
    iconWrapClass: 'bg-chart-ram/15 text-chart-ram',
    bgImage: ramUsageBg,
    gaugeColor: 'ram'
  }
}

export function getMonitoringSummaryVisual(id: MetricId): MonitoringSummaryVisual {
  return summaryVisuals[id]
}

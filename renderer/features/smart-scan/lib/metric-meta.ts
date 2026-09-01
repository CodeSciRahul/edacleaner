import { HardDrive, ScanSearch, Sparkles, Zap, type LucideIcon } from 'lucide-react'
import reclaimableSpaceBg from '@/assets/smart-scan/metrics/reclaimable-space-bg.png'
import duplicateFilesBg from '@/assets/smart-scan/metrics/duplicate-files-bg.png'
import bootImpactBg from '@/assets/smart-scan/metrics/boot-impact-bg.png'
import scanDurationBg from '@/assets/smart-scan/metrics/scan-duration-bg.png'

export type SmartScanMetricId = 'reclaimable' | 'duplicates' | 'boot' | 'duration'

export interface SmartScanMetricVisual {
  icon: LucideIcon
  iconWrapClass: string
  bgImage: string
}

const metricVisuals: Record<SmartScanMetricId, SmartScanMetricVisual> = {
  reclaimable: {
    icon: Sparkles,
    iconWrapClass: 'bg-success/15 text-success',
    bgImage: reclaimableSpaceBg
  },
  duplicates: {
    icon: HardDrive,
    iconWrapClass: 'bg-primary/15 text-primary',
    bgImage: duplicateFilesBg
  },
  boot: {
    icon: Zap,
    iconWrapClass: 'bg-warning/15 text-warning',
    bgImage: bootImpactBg
  },
  duration: {
    icon: ScanSearch,
    iconWrapClass: 'bg-chart-ram/15 text-chart-ram',
    bgImage: scanDurationBg
  }
}

export function getMetricVisual(id: SmartScanMetricId): SmartScanMetricVisual {
  return metricVisuals[id]
}

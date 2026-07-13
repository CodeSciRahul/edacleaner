import {
  HardDrive,
  ScanSearch,
  Shield,
  Sparkles,
  Zap,
  type LucideIcon
} from 'lucide-react'
import type { SmartScanAreaId } from '@shared/interfaces'

export const smartScanAreaIcons: Record<SmartScanAreaId, LucideIcon> = {
  cleanup: Sparkles,
  storage: HardDrive,
  performance: Zap,
  security: Shield
}

export const smartScanStatusStyles = {
  good: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  issue: 'bg-primary/10 text-primary'
} as const

export const smartScanStatusLabels = {
  good: 'Good',
  warning: 'Review',
  issue: 'Optimize'
} as const

export function formatScanDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`
  const totalSec = Math.round(ms / 1000)
  if (totalSec < 60) return `${totalSec}s`
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

export { ScanSearch }

import {
  Trash2,
  Clock,
  Recycle,
  Globe,
  Database,
  type LucideIcon
} from 'lucide-react'
import type { CleanupCategoryId } from '@shared/interfaces'

export interface CleanupCategoryVisual {
  icon: LucideIcon
  accentClass: string
  iconWrapClass: string
}

const categoryVisuals: Record<CleanupCategoryId, CleanupCategoryVisual> = {
  junk: {
    icon: Trash2,
    accentClass: 'text-chart-disk',
    iconWrapClass: 'bg-chart-disk/15 text-chart-disk'
  },
  temp: {
    icon: Clock,
    accentClass: 'text-primary',
    iconWrapClass: 'bg-primary/15 text-primary'
  },
  recycle: {
    icon: Recycle,
    accentClass: 'text-success',
    iconWrapClass: 'bg-success/15 text-success'
  },
  browser: {
    icon: Globe,
    accentClass: 'text-chart-ram',
    iconWrapClass: 'bg-chart-ram/15 text-chart-ram'
  },
  system: {
    icon: Database,
    accentClass: 'text-warning',
    iconWrapClass: 'bg-warning/15 text-warning'
  }
}

export function getCategoryVisual(id: CleanupCategoryId): CleanupCategoryVisual {
  return categoryVisuals[id] ?? categoryVisuals.junk
}

export type CleanupWorkflowPhase = 'idle' | 'scan' | 'review' | 'clean' | 'done'

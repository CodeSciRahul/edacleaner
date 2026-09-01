import {
  Trash2,
  Clock,
  Recycle,
  Globe,
  Database,
  type LucideIcon
} from 'lucide-react'
import type { CleanupCategoryId } from '@shared/interfaces'
import junkFilesBg from '@/assets/cleanup/categories/junk-files-bg.png'
import tempFilesBg from '@/assets/cleanup/categories/temp-files-bg.png'
import recycleBinBg from '@/assets/cleanup/categories/recycle-bin-bg.png'
import browserCacheBg from '@/assets/cleanup/categories/browser-cache-bg.png'
import systemCacheBg from '@/assets/cleanup/categories/system-cache-bg.png'

export interface CleanupCategoryVisual {
  icon: LucideIcon
  accentClass: string
  iconWrapClass: string
  bgImage: string
}

const categoryVisuals: Record<CleanupCategoryId, CleanupCategoryVisual> = {
  junk: {
    icon: Trash2,
    accentClass: 'text-chart-disk',
    iconWrapClass: 'bg-chart-disk/15 text-chart-disk',
    bgImage: junkFilesBg
  },
  temp: {
    icon: Clock,
    accentClass: 'text-primary',
    iconWrapClass: 'bg-primary/15 text-primary',
    bgImage: tempFilesBg
  },
  recycle: {
    icon: Recycle,
    accentClass: 'text-success',
    iconWrapClass: 'bg-success/15 text-success',
    bgImage: recycleBinBg
  },
  browser: {
    icon: Globe,
    accentClass: 'text-chart-ram',
    iconWrapClass: 'bg-chart-ram/15 text-chart-ram',
    bgImage: browserCacheBg
  },
  system: {
    icon: Database,
    accentClass: 'text-warning',
    iconWrapClass: 'bg-warning/15 text-warning',
    bgImage: systemCacheBg
  }
}

export function getCategoryVisual(id: CleanupCategoryId): CleanupCategoryVisual {
  return categoryVisuals[id] ?? categoryVisuals.junk
}

export type CleanupWorkflowPhase = 'idle' | 'scan' | 'review' | 'clean' | 'done'

import { Database, HardDrive, HeartPulse, Disc3 } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import {
  aggregateDriveTotals,
  capacityStatusClass,
  capacityStatusLabel,
  type DriveTotals
} from '../lib/storage-health'
import type { DriveInfo } from '@shared/interfaces'

interface StorageSummaryCardsProps {
  drives: DriveInfo[]
  isLoading: boolean
}

export function StorageSummaryCards({
  drives,
  isLoading
}: StorageSummaryCardsProps): React.ReactElement {
  const totals: DriveTotals = aggregateDriveTotals(drives)

  if (isLoading) {
    return (
      <section aria-label="Storage summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[96px] animate-pulse rounded-xl border border-border bg-muted/40"
          />
        ))}
      </section>
    )
  }

  const cards = [
    {
      id: 'total',
      label: 'Total capacity',
      value: formatBytes(totals.totalBytes),
      icon: Database,
      accent: 'text-primary bg-primary/10'
    },
    {
      id: 'used',
      label: 'Used storage',
      value: formatBytes(totals.usedBytes),
      icon: Disc3,
      accent: 'text-chart-disk bg-chart-disk/10'
    },
    {
      id: 'free',
      label: 'Available',
      value: formatBytes(totals.freeBytes),
      icon: HardDrive,
      accent: 'text-success bg-success/10'
    },
    {
      id: 'percent',
      label: 'Usage',
      value: `${totals.usedPercent}%`,
      icon: Disc3,
      accent: 'text-warning bg-warning/10'
    },
    {
      id: 'health',
      label: 'Storage health',
      value: capacityStatusLabel[totals.overallStatus],
      icon: HeartPulse,
      accent: 'text-foreground bg-muted',
      badge: (
        <span
          className={cn(
            'mt-2 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium',
            capacityStatusClass[totals.overallStatus]
          )}
        >
          {totals.driveCount} drive{totals.driveCount === 1 ? '' : 's'}
        </span>
      )
    }
  ] as const

  return (
    <section aria-label="Storage summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <article
            key={card.id}
            className="rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  card.accent
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </div>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {drives.length === 0 && card.id !== 'health' ? '—' : card.value}
            </p>
            {'badge' in card ? card.badge : null}
          </article>
        )
      })}
    </section>
  )
}

import { HardDrive, Files, Layers } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

interface CleanupStatsBarProps {
  reclaimableBytes: number
  fileCount: number
  categoryCount: number
  className?: string
}

export function CleanupStatsBar({
  reclaimableBytes,
  fileCount,
  categoryCount,
  className
}: CleanupStatsBarProps): React.ReactElement {
  const { t } = useTranslation()

  const stats = [
    {
      icon: HardDrive,
      label: t('cleanup.stats.reclaim'),
      value: formatBytes(reclaimableBytes),
      wrap: 'bg-chart-disk/15 text-chart-disk ring-1 ring-chart-disk/20',
      wash: 'from-chart-disk/15 via-chart-disk/5 to-transparent'
    },
    {
      icon: Files,
      label: t('cleanup.stats.items'),
      value: fileCount.toLocaleString(),
      wrap: 'bg-chart-ram/15 text-chart-ram ring-1 ring-chart-ram/20',
      wash: 'from-chart-ram/15 via-chart-ram/5 to-transparent'
    },
    {
      icon: Layers,
      label: t('cleanup.stats.categories'),
      value: String(categoryCount),
      wrap: 'bg-success/15 text-success ring-1 ring-success/20',
      wash: 'from-success/15 via-success/5 to-transparent'
    }
  ]

  return (
    <div
      className={cn('grid gap-3 sm:grid-cols-3', className)}
      aria-label="Cleanup statistics"
    >
      {stats.map(({ icon: Icon, label, value, wrap, wash }) => (
        <div
          key={label}
          className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3.5 shadow-card"
        >
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b',
              wash
            )}
            aria-hidden="true"
          />
          <div
            className={cn(
              'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              wrap
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="relative z-10 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="truncate text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {value}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

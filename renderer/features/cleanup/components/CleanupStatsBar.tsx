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
      accent: 'text-primary'
    },
    {
      icon: Files,
      label: t('cleanup.stats.items'),
      value: fileCount.toLocaleString(),
      accent: 'text-chart-ram'
    },
    {
      icon: Layers,
      label: t('cleanup.stats.categories'),
      value: String(categoryCount),
      accent: 'text-success'
    }
  ]

  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-3',
        className
      )}
      aria-label="Cleanup statistics"
    >
      {stats.map(({ icon: Icon, label, value, accent }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-border/80 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm"
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/80',
              accent
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
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

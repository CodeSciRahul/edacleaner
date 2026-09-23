import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Copy, FileStack, PieChart } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

interface StorageInsightsSectionProps {
  largeTotalBytes: number
  duplicateWasteBytes: number
  largeLoading: boolean
  duplicatesLoading: boolean
  analyzing: boolean
  hasDuplicates: boolean
  onOpenLargeFiles: () => void
  onOpenDuplicates: () => void
  onCleanup: () => void
}

type InsightAccent = 'large' | 'duplicates' | 'reclaim'

const ACCENT_STYLES: Record<
  InsightAccent,
  {
    wash: string
    orb: string
    iconWrap: string
    cta: string
    ringHover: string
  }
> = {
  large: {
    wash: 'from-warning/20 via-warning/5 to-transparent',
    orb: 'bg-warning/25',
    iconWrap: 'bg-warning/15 text-warning ring-1 ring-warning/25',
    cta: 'bg-warning/10 text-warning group-hover:bg-warning/15',
    ringHover:
      'hover:border-warning/40 hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.4)]'
  },
  duplicates: {
    wash: 'from-chart-disk/25 via-chart-disk/5 to-transparent',
    orb: 'bg-chart-disk/20',
    iconWrap: 'bg-chart-disk/15 text-chart-disk ring-1 ring-chart-disk/25',
    cta: 'bg-chart-disk/10 text-chart-disk group-hover:bg-chart-disk/15',
    ringHover:
      'hover:border-chart-disk/40 hover:shadow-[0_18px_40px_-16px_rgba(139,92,246,0.4)]'
  },
  reclaim: {
    wash: 'from-success/20 via-success/5 to-transparent',
    orb: 'bg-success/20',
    iconWrap: 'bg-success/15 text-success ring-1 ring-success/25',
    cta: 'bg-success/10 text-success group-hover:bg-success/15',
    ringHover:
      'hover:border-success/40 hover:shadow-[0_18px_40px_-16px_rgba(34,197,94,0.35)]'
  }
}

export function StorageInsightsSection({
  largeTotalBytes,
  duplicateWasteBytes,
  largeLoading,
  duplicatesLoading,
  analyzing,
  hasDuplicates,
  onOpenLargeFiles,
  onOpenDuplicates,
  onCleanup
}: StorageInsightsSectionProps): React.ReactElement {
  const { t } = useTranslation()

  const items: Array<{
    id: string
    accent: InsightAccent
    icon: LucideIcon
    title: string
    description: string
    value: string
    actionLabel: string
    onAction: () => void
  }> = [
    {
      id: 'large',
      accent: 'large',
      icon: FileStack,
      title: t('storage.insights.largeFiles'),
      description: t('storage.insights.largeFilesDesc'),
      value: largeLoading ? '…' : formatBytes(largeTotalBytes),
      actionLabel: t('storage.insights.openLarge'),
      onAction: onOpenLargeFiles
    },
    {
      id: 'duplicates',
      accent: 'duplicates',
      icon: Copy,
      title: t('storage.insights.duplicates'),
      description: t('storage.insights.duplicatesDesc'),
      value: duplicatesLoading ? '…' : formatBytes(duplicateWasteBytes),
      actionLabel: t('storage.insights.openDupes'),
      onAction: onOpenDuplicates
    },
    {
      id: 'reclaim',
      accent: 'reclaim',
      icon: PieChart,
      title: t('storage.insights.reclaimable'),
      description: t('storage.insights.reclaimableDesc'),
      value: analyzing && !hasDuplicates ? '…' : formatBytes(duplicateWasteBytes),
      actionLabel: t('storage.insights.cleanup'),
      onAction: onCleanup
    }
  ]

  return (
    <div className="space-y-6">
      <section aria-label={t('storage.insights.title')}>
        <div className="mb-4">
          <h2 className="text-section-title text-foreground">{t('storage.insights.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('storage.insights.hint')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon
            const style = ACCENT_STYLES[item.accent]

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onAction}
                className={cn(
                  'group relative flex min-h-[188px] flex-col overflow-hidden rounded-2xl border border-border',
                  'bg-card text-left shadow-card',
                  'transition-all duration-200 ease-out hover:-translate-y-1',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  style.ringHover
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b',
                    style.wash
                  )}
                  aria-hidden="true"
                />
                <div
                  className={cn(
                    'pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl',
                    'opacity-70 transition-opacity duration-200 group-hover:opacity-100',
                    style.orb
                  )}
                  aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm backdrop-blur-sm',
                        style.iconWrap
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
                    </div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-muted-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="mt-4 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight text-foreground">
                      {item.value}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-auto pt-5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        style.cta
                      )}
                    >
                      {item.actionLabel}
                      <ArrowRight
                        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-label={t('storage.insights.quickLinks')} className="grid gap-4 sm:grid-cols-2">
        <QuickLink
          title={t('storage.insights.manageLarge')}
          description={t('storage.insights.manageLargeDesc')}
          onClick={onOpenLargeFiles}
          accent="large"
          icon={FileStack}
        />
        <QuickLink
          title={t('storage.insights.reviewDupes')}
          description={t('storage.insights.reviewDupesDesc')}
          onClick={onOpenDuplicates}
          accent="duplicates"
          icon={Copy}
        />
      </section>
    </div>
  )
}

function QuickLink({
  title,
  description,
  onClick,
  accent,
  icon: Icon
}: {
  title: string
  description: string
  onClick: () => void
  accent: 'large' | 'duplicates'
  icon: LucideIcon
}): React.ReactElement {
  const styles =
    accent === 'large'
      ? {
          wash: 'from-warning/20 via-warning/5 to-transparent',
          iconWrap: 'bg-warning/15 text-warning ring-1 ring-warning/25',
          hover:
            'hover:border-warning/40 hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.35)]'
        }
      : {
          wash: 'from-chart-disk/25 via-chart-disk/5 to-transparent',
          iconWrap: 'bg-chart-disk/15 text-chart-disk ring-1 ring-chart-disk/25',
          hover:
            'hover:border-chart-disk/40 hover:shadow-[0_18px_40px_-16px_rgba(139,92,246,0.35)]'
        }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border',
        'bg-card px-5 py-4 text-left shadow-card transition-all duration-200',
        'hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        styles.hover
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r',
          styles.wash
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          styles.iconWrap
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/70 text-muted-foreground shadow-sm transition-all group-hover:translate-x-0.5 group-hover:text-foreground">
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </button>
  )
}

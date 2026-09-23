import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

export type PerformanceActionAccent = 'startup' | 'background' | 'ram' | 'disk'

export interface PerformanceActionItem {
  id: string
  icon: LucideIcon
  title: string
  description: string
  value: string
  actionLabel: string
  onAction: () => void
  accent: PerformanceActionAccent
}

const ACCENT_STYLES: Record<
  PerformanceActionAccent,
  {
    wash: string
    orb: string
    iconWrap: string
    value: string
    cta: string
    ringHover: string
  }
> = {
  startup: {
    wash: 'from-warning/20 via-warning/5 to-transparent',
    orb: 'bg-warning/25',
    iconWrap: 'bg-warning/15 text-warning ring-1 ring-warning/25',
    value: 'text-foreground',
    cta: 'bg-warning/10 text-warning group-hover:bg-warning/15',
    ringHover:
      'hover:border-warning/40 hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.4)]'
  },
  background: {
    wash: 'from-primary/20 via-primary/5 to-transparent',
    orb: 'bg-primary/20',
    iconWrap: 'bg-primary/15 text-primary ring-1 ring-primary/25',
    value: 'text-foreground',
    cta: 'bg-primary/10 text-primary group-hover:bg-primary/15',
    ringHover:
      'hover:border-primary/40 hover:shadow-[0_18px_40px_-16px_rgba(37,99,235,0.35)]'
  },
  ram: {
    wash: 'from-chart-ram/25 via-chart-ram/5 to-transparent',
    orb: 'bg-chart-ram/20',
    iconWrap: 'bg-chart-ram/15 text-chart-ram ring-1 ring-chart-ram/25',
    value: 'text-foreground',
    cta: 'bg-chart-ram/10 text-chart-ram group-hover:bg-chart-ram/15',
    ringHover:
      'hover:border-chart-ram/40 hover:shadow-[0_18px_40px_-16px_rgba(6,182,212,0.4)]'
  },
  disk: {
    wash: 'from-chart-disk/25 via-chart-disk/5 to-transparent',
    orb: 'bg-chart-disk/20',
    iconWrap: 'bg-chart-disk/15 text-chart-disk ring-1 ring-chart-disk/25',
    value: 'text-foreground',
    cta: 'bg-chart-disk/10 text-chart-disk group-hover:bg-chart-disk/15',
    ringHover:
      'hover:border-chart-disk/40 hover:shadow-[0_18px_40px_-16px_rgba(139,92,246,0.4)]'
  }
}

interface PerformanceActionGridProps {
  items: PerformanceActionItem[]
}

export function PerformanceActionGrid({
  items
}: PerformanceActionGridProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section aria-label={t('performance.optimizeFurther')}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-section-title text-foreground">
            {t('performance.optimizeFurther')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('performance.optimizeFurtherHint')}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
              {/* Soft accent wash */}
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b',
                  style.wash
                )}
                aria-hidden="true"
              />
              {/* Decorative orb */}
              <div
                className={cn(
                  'pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity duration-200',
                  style.orb,
                  'opacity-70 group-hover:opacity-100'
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
                  <p
                    className={cn(
                      'mt-1.5 text-[1.75rem] font-semibold leading-none tabular-nums tracking-tight',
                      style.value
                    )}
                  >
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
  )
}

import { ArrowRight, Layers, Power } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

interface PerformanceQuickLinksProps {
  onOpenStartup: () => void
  onOpenBackground: () => void
}

export function PerformanceQuickLinks({
  onOpenStartup,
  onOpenBackground
}: PerformanceQuickLinksProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section aria-label={t('performance.optimizeFurther')} className="grid gap-4 sm:grid-cols-2">
      <QuickLink
        title={t('performance.quickStartup')}
        description={t('performance.quickStartupDesc')}
        onClick={onOpenStartup}
        accent="startup"
        icon={Power}
      />
      <QuickLink
        title={t('performance.quickBg')}
        description={t('performance.quickBgDesc')}
        onClick={onOpenBackground}
        accent="background"
        icon={Layers}
      />
    </section>
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
  accent: 'startup' | 'background'
  icon: typeof Power
}): React.ReactElement {
  const styles =
    accent === 'startup'
      ? {
          wash: 'from-warning/20 via-warning/5 to-transparent',
          iconWrap: 'bg-warning/15 text-warning ring-1 ring-warning/25',
          hover:
            'hover:border-warning/40 hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.35)]'
        }
      : {
          wash: 'from-primary/20 via-primary/5 to-transparent',
          iconWrap: 'bg-primary/15 text-primary ring-1 ring-primary/25',
          hover:
            'hover:border-primary/40 hover:shadow-[0_18px_40px_-16px_rgba(37,99,235,0.35)]'
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

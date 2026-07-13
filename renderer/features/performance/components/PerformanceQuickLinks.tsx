import { ArrowRight } from 'lucide-react'
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
    <section aria-label={t('performance.optimizeFurther')} className="grid gap-3 sm:grid-cols-2">
      <QuickLink
        title={t('performance.quickStartup')}
        description={t('performance.quickStartupDesc')}
        onClick={onOpenStartup}
      />
      <QuickLink
        title={t('performance.quickBg')}
        description={t('performance.quickBgDesc')}
        onClick={onOpenBackground}
      />
    </section>
  )
}

function QuickLink({
  title,
  description,
  onClick
}: {
  title: string
  description: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-card-hover"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  )
}

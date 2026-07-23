import { useNavigate } from 'react-router-dom'
import { ScanSearch, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppIcon } from '@/components/brand'
import { useTranslation } from '@/i18n/useTranslation'

export function ReportsEmptyState(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-gradient-to-b from-muted/40 via-card to-muted/10 px-8 py-16 text-center animate-in fade-in-0 zoom-in-95 duration-500">
      <div
        className="pointer-events-none absolute -left-10 top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-6 h-36 w-36 rounded-full bg-success/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center">
        <AppIcon size="xl" className="h-16 w-16 shadow-sm" />
      </div>
      <div className="relative mb-3 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {t('reports.insights')}
      </div>
      <h2 className="relative text-section-title text-foreground">{t('reports.empty.title')}</h2>
      <p className="relative mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
        {t('reports.empty.desc')}
      </p>

      <div className="relative mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-3">
        {[
          t('reports.empty.previewHealth'),
          t('reports.empty.previewTrends'),
          t('reports.empty.previewHistory')
        ].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-border/80 bg-card/80 px-3 py-3 text-xs text-muted-foreground backdrop-blur-sm"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button className="gap-2" onClick={() => navigate('/smart-scan')}>
          <ScanSearch className="h-4 w-4" aria-hidden="true" />
          {t('reports.empty.ctaScan')}
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => navigate('/cleanup')}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('reports.empty.ctaCleanup')}
        </Button>
      </div>
    </div>
  )
}

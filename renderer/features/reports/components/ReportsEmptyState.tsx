import { useNavigate } from 'react-router-dom'
import { BarChart3, ScanSearch, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n/useTranslation'

export function ReportsEmptyState(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center animate-in fade-in-0 zoom-in-95 duration-500">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <BarChart3 className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{t('reports.insights')}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('reports.hero.noActivityYet')}
        </p>
      </div>

      <div className="grid w-full max-w-lg gap-2 text-left sm:grid-cols-3">
        {[
          t('reports.empty.previewHealth'),
          t('reports.empty.previewTrends'),
          t('reports.empty.previewHistory')
        ].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-border/80 bg-card/80 px-3 py-3 text-xs text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button
          size="sm"
          className="h-9 gap-2 rounded-lg px-4 text-[13px]"
          onClick={() => navigate('/smart-scan')}
        >
          <ScanSearch className="h-4 w-4" aria-hidden="true" />
          {t('reports.empty.ctaScan')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-2 rounded-lg px-3 text-[13px]"
          onClick={() => navigate('/cleanup')}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('reports.empty.ctaCleanup')}
        </Button>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { BarChart3, HeartPulse, ScanSearch, TrendingUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'

export function ReportsEmptyState(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const previews = [
    { icon: HeartPulse, label: t('reports.empty.previewHealth') },
    { icon: TrendingUp, label: t('reports.empty.previewTrends') },
    { icon: BarChart3, label: t('reports.empty.previewHistory') }
  ]

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-card animate-in fade-in-0 zoom-in-95 duration-500">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <BarChart3 className="h-6 w-6" strokeWidth={1.85} aria-hidden="true" />
      </div>

      <div className="relative z-10 max-w-md space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{t('reports.empty.title')}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t('reports.hero.noActivityYet')}
        </p>
      </div>

      <div className="relative z-10 mt-5 grid w-full max-w-lg gap-2 text-left sm:grid-cols-3">
        {previews.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/60 px-3 py-3',
              'backdrop-blur-sm'
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-3.5 w-3.5" strokeWidth={1.85} aria-hidden="true" />
            </div>
            <p className="text-xs leading-snug text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-2">
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
          className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
          onClick={() => navigate('/cleanup')}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t('reports.empty.ctaCleanup')}
        </Button>
      </div>
    </div>
  )
}

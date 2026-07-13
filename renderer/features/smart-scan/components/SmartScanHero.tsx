import { CheckCircle2, Gauge, Sparkles } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { SmartScanResult } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'

interface SmartScanHeroProps {
  result: SmartScanResult
}

export function SmartScanHero({ result }: SmartScanHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const healthy = result.areasNeedingAttention === 0

  return (
    <section
      aria-label={t('smartScan.results')}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6 shadow-card animate-in fade-in-0 slide-in-from-top-1 duration-300 sm:p-7',
        healthy
          ? 'border-success/25 bg-gradient-to-br from-card via-card to-success/[0.08]'
          : 'border-primary/25 bg-gradient-to-br from-card via-card to-primary/[0.08]'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl',
          healthy ? 'bg-success/15' : 'bg-primary/12'
        )}
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            {t('smartScan.hero.complete')}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
            {result.summaryTitle}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{result.summaryMessage}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border/80 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Gauge className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('smartScan.hero.healthScore')}
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {result.healthScore}
              <span className="ml-1 text-sm font-medium text-muted-foreground">/ 100</span>
            </p>
          </div>
        </div>
      </div>

      {result.totalReclaimableBytes > 0 ? (
        <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-success/20 bg-success/5 px-3.5 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('smartScan.hero.reclaimHint', {
              bytes: formatBytes(result.totalReclaimableBytes)
            })}
          </p>
        </div>
      ) : null}
    </section>
  )
}

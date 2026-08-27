import { CheckCircle2, Gauge, Sparkles } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { SmartScanResult } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import scanHeroBgDark from '@/assets/smart-scan/scan-hero-bg-dark.png'
import scanHeroBgLight from '@/assets/smart-scan/scan-hero-bg-light.png'

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
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card',
        'animate-in fade-in-0 slide-in-from-top-1 duration-300 sm:p-7',
        healthy ? 'border-success/25' : 'border-primary/25'
      )}
    >
      {/* Full-card scan art — `.light` / `.dark` on <html> */}
      <img
        src={scanHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={scanHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      {/* Soft left scrim keeps copy/score readable over calm left of art */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />

      {/* Copy + score stay in the left zone; art owns the right */}
      <div className="relative z-10 flex min-h-[200px] max-w-md flex-col justify-center gap-5 sm:min-h-[240px] sm:max-w-lg sm:gap-6 lg:max-w-xl">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-success">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            {t('smartScan.hero.complete')}
          </div>
          <div>
            <h2 className="text-section-title text-foreground sm:text-2xl">{result.summaryTitle}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {result.summaryMessage}
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-border/70 bg-background/55 px-3.5 py-3 backdrop-blur-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gauge className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('smartScan.hero.healthScore')}
            </p>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
              {result.healthScore}
              <span className="ml-1 text-sm font-medium text-muted-foreground">/ 100</span>
            </p>
          </div>
        </div>

        {result.totalReclaimableBytes > 0 ? (
          <div className="flex max-w-sm items-start gap-2 rounded-xl border border-success/20 bg-success/5 px-3.5 py-2.5 backdrop-blur-sm">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('smartScan.hero.reclaimHint', {
                bytes: formatBytes(result.totalReclaimableBytes)
              })}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  )
}

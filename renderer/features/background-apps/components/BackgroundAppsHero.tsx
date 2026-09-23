import { useNavigate } from 'react-router-dom'
import { Layers, Loader2, Radio, RefreshCw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import { formatBytes } from '@shared/utils'
import backgroundAppsHeroBgDark from '@/assets/background-apps/background-apps-hero-bg-dark.png'
import backgroundAppsHeroBgLight from '@/assets/background-apps/background-apps-hero-bg-light.png'

interface BackgroundAppsHeroProps {
  isLoading: boolean
  isRefreshing: boolean
  isLive: boolean
  accessAllowed: boolean
  listedCount: number
  memoryBytes: number
  onRefresh: () => void
}

export function BackgroundAppsHero({
  isLoading,
  isRefreshing,
  isLive,
  accessAllowed,
  listedCount,
  memoryBytes,
  onRefresh
}: BackgroundAppsHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const locked = !accessAllowed

  let headline: string
  let subtext: string

  if (locked) {
    headline = t('backgroundApps.hero.lockedTitle')
    subtext = t('backgroundApps.hero.lockedMsg')
  } else if (isLoading) {
    headline = t('backgroundApps.hero.loadingHeadline')
    subtext = t('backgroundApps.hero.loadingSub')
  } else if (listedCount === 0) {
    headline = t('backgroundApps.hero.emptyHeadline')
    subtext = t('backgroundApps.hero.emptySub')
  } else {
    headline = t('backgroundApps.hero.readyHeadline', { count: listedCount })
    subtext = t('backgroundApps.hero.readySub')
  }

  const listedValue = locked ? '—' : isLoading ? '…' : String(listedCount)
  const memoryValue = locked ? '—' : isLoading ? '…' : formatBytes(memoryBytes)
  const liveValue = locked
    ? '—'
    : isLive
      ? t('backgroundApps.live')
      : t('backgroundApps.offline')

  let tip: string
  if (locked) {
    tip = t('backgroundApps.hero.tipLocked')
  } else if (isLoading) {
    tip = t('backgroundApps.hero.tipLoading')
  } else if (listedCount === 0) {
    tip = t('backgroundApps.hero.tipEmpty')
  } else {
    tip = t('backgroundApps.hero.tipReady')
  }

  return (
    <section
      aria-label={t('backgroundApps.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        locked ? 'border-primary/20' : 'border-chart-ram/25'
      )}
    >
      <img
        src={backgroundAppsHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={backgroundAppsHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/92 via-card/60 to-transparent sm:via-card/42"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1',
                'text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                locked
                  ? 'border-primary/25 bg-primary/10 text-primary'
                  : 'border-chart-ram/30 bg-chart-ram/10 text-chart-ram'
              )}
            >
              {isLoading && !locked ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Layers className="h-3 w-3" aria-hidden="true" />
              )}
              {isLoading && !locked
                ? t('backgroundApps.hero.badgeLoading')
                : t('backgroundApps.hero.badge')}
            </div>
            {locked ? <PremiumBadge plan="premium" size="md" /> : null}
            {!locked ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                  'text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                  isLive
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-border/80 bg-background/60 text-muted-foreground'
                )}
                title={
                  isLive
                    ? t('backgroundApps.hero.liveTitle')
                    : t('backgroundApps.hero.offlineTitle')
                }
              >
                <Radio
                  className={cn('h-3 w-3', isLive && 'animate-pulse')}
                  aria-hidden="true"
                />
                {isLive ? t('backgroundApps.live') : t('backgroundApps.offline')}
              </span>
            ) : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {headline}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label={t('backgroundApps.hero.statListed')} value={listedValue} />
            <StatPill label={t('backgroundApps.hero.statMemory')} value={memoryValue} />
            <StatPill label={t('backgroundApps.hero.statLive')} value={liveValue} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              disabled={isRefreshing || isLoading}
              onClick={onRefresh}
            >
              <RefreshCw
                className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                aria-hidden="true"
              />
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              onClick={() => navigate('/performance')}
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              {t('backgroundApps.hero.jumpPerformance')}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{tip}</p>
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

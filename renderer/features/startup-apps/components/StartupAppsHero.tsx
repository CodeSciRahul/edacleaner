import { useNavigate } from 'react-router-dom'
import { Loader2, Power, RefreshCw, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import startupAppsHeroBgDark from '@/assets/startup-apps/startup-apps-hero-bg-dark.png'
import startupAppsHeroBgLight from '@/assets/startup-apps/startup-apps-hero-bg-light.png'

interface StartupAppsHeroProps {
  isLoading: boolean
  isRefreshing: boolean
  accessAllowed: boolean
  totalCount: number
  enabledCount: number
  manageableCount: number
  onRefresh: () => void
}

export function StartupAppsHero({
  isLoading,
  isRefreshing,
  accessAllowed,
  totalCount,
  enabledCount,
  manageableCount,
  onRefresh
}: StartupAppsHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const locked = !accessAllowed

  let headline: string
  let subtext: string

  if (locked) {
    headline = t('startupApps.hero.lockedTitle')
    subtext = t('startupApps.hero.lockedMsg')
  } else if (isLoading) {
    headline = t('startupApps.hero.loadingHeadline')
    subtext = t('startupApps.hero.loadingSub')
  } else if (totalCount === 0) {
    headline = t('startupApps.hero.emptyHeadline')
    subtext = t('startupApps.hero.emptySub')
  } else {
    headline = t('startupApps.hero.readyHeadline', {
      enabled: enabledCount,
      total: totalCount
    })
    subtext = t('startupApps.hero.readySub')
  }

  const totalValue = locked ? '—' : isLoading ? '…' : String(totalCount)
  const enabledValue = locked ? '—' : isLoading ? '…' : String(enabledCount)
  const manageableValue = locked ? '—' : isLoading ? '…' : String(manageableCount)

  let tip: string
  if (locked) {
    tip = t('startupApps.hero.tipLocked')
  } else if (isLoading) {
    tip = t('startupApps.hero.tipLoading')
  } else if (totalCount === 0) {
    tip = t('startupApps.hero.tipEmpty')
  } else {
    tip = t('startupApps.hero.tipReady')
  }

  return (
    <section
      aria-label={t('startupApps.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        locked ? 'border-primary/20' : 'border-warning/20'
      )}
    >
      <img
        src={startupAppsHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={startupAppsHeroBgDark}
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
                  : 'border-warning/30 bg-warning/10 text-warning'
              )}
            >
              {isLoading && !locked ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Power className="h-3 w-3" aria-hidden="true" />
              )}
              {isLoading && !locked
                ? t('startupApps.hero.badgeLoading')
                : t('startupApps.hero.badge')}
            </div>
            {locked ? <PremiumBadge plan="premium" size="md" /> : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {headline}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label={t('startupApps.hero.statTotal')} value={totalValue} />
            <StatPill label={t('startupApps.hero.statEnabled')} value={enabledValue} />
            <StatPill label={t('startupApps.hero.statManageable')} value={manageableValue} />
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
              {t('startupApps.hero.jumpPerformance')}
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

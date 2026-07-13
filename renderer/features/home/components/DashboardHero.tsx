import { useNavigate } from 'react-router-dom'
import { ArrowRight, ScanSearch, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import {
  formatRelativeScanTime
} from '@/features/smart-scan/lib/scan-history'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

interface DashboardHeroProps {
  analytics: ReportsAnalytics | null
  hasHistory: boolean
  cpu: number | null
  ram: number | null
}

function pressureStatus(
  cpu: number | null,
  ram: number | null
): 'good' | 'warning' | 'critical' {
  const peak = Math.max(cpu ?? 0, ram ?? 0)
  if (peak >= 85) return 'critical'
  if (peak >= 70) return 'warning'
  return 'good'
}

export function DashboardHero({
  analytics,
  hasHistory,
  cpu,
  ram
}: DashboardHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const live = pressureStatus(cpu, ram)

  let titleKey: TranslationKey = 'home.hero.readyTitle'
  let messageKey: TranslationKey = 'home.hero.readyMessage'
  let status: 'good' | 'warning' | 'critical' = live

  if (hasHistory && analytics) {
    if (analytics.issuesFoundLatest > 0) {
      titleKey = 'home.hero.issuesTitle'
      messageKey = 'home.hero.issuesMessage'
      status = analytics.issuesFoundLatest >= 3 ? 'warning' : 'good'
    } else if (analytics.healthScore != null && analytics.healthScore < 55) {
      titleKey = 'home.hero.boostTitle'
      messageKey = 'home.hero.boostMessage'
      status = 'warning'
    } else if (live === 'critical') {
      titleKey = 'home.hero.pressureTitle'
      messageKey = 'home.hero.pressureMessage'
      status = 'critical'
    } else {
      titleKey = 'home.hero.goodTitle'
      messageKey = 'home.hero.goodMessage'
      status = 'good'
    }
  } else if (live === 'critical' || live === 'warning') {
    titleKey = 'home.hero.pressureTitle'
    messageKey = 'home.hero.pressureMessage'
    status = live
  }

  const statusWrap = {
    good: 'border-success/25 bg-success/10 text-success',
    warning: 'border-warning/25 bg-warning/10 text-warning',
    critical: 'border-destructive/25 bg-destructive/10 text-destructive'
  }[status]

  return (
    <section
      aria-label={t('home.hero.aria')}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/[0.08] p-6 shadow-card sm:p-7',
        'animate-in fade-in-0 slide-in-from-top-1 duration-300'
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-success/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-3">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
              statusWrap
            )}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t('home.hero.badge')}
          </div>
          <div>
            <h2 className="text-section-title text-foreground sm:text-2xl">{t(titleKey)}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t(messageKey, {
                score: analytics?.healthScore ?? '—',
                issues: analytics?.issuesFoundLatest ?? 0,
                bytes: formatBytes(analytics?.lifetimeBytesFreed ?? 0)
              })}
            </p>
          </div>
          {hasHistory && analytics?.lastActivityAt ? (
            <p className="text-xs text-muted-foreground">
              {t('home.hero.lastActivity', {
                when: formatRelativeScanTime(analytics.lastActivityAt)
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t('home.hero.firstRun')}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="h-10 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => navigate('/smart-scan')}
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            {t('home.scanNow')}
          </Button>
          <Button
            variant="outline"
            className="h-10 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => navigate('/cleanup')}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t('home.junkAction')}
          </Button>
          {hasHistory ? (
            <Button
              variant="ghost"
              className="h-10 gap-1.5 rounded-lg px-3 text-[13px]"
              onClick={() => navigate('/reports')}
            >
              {t('home.viewReports')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

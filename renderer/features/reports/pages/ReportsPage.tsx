import { useMemo } from 'react'
import { CheckCircle2, FileBarChart2, Sparkles } from 'lucide-react'
import { StatusCard } from '@/components/desktop/StatusCard'
import { formatBytes } from '@shared/utils'
import { electronService } from '@/services/electron-service'
import { useReportsHistory } from '@/features/reports/hooks/useReportsHistory'
import { ReportsHero, type ReportsHeroPhase } from '@/features/reports/components/ReportsHero'
import { ReportsInsightGrid } from '@/features/reports/components/ReportsInsightGrid'
import { ReportsChartsSection } from '@/features/reports/components/ReportsChartsSection'
import { ReportsLastScanCard } from '@/features/reports/components/ReportsLastScanCard'
import { ActivityTimeline } from '@/features/reports/components/ActivityTimeline'
import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'
import { ReportsSkeleton } from '@/features/reports/components/ReportsSkeleton'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { FeatureLockedCallout } from '@/features/entitlements/components/FeatureLockedCallout'
import type { HealthBand } from '@/features/reports/lib/reports-analytics'

const bandTitleKey: Record<HealthBand, TranslationKey> = {
  excellent: 'reports.health.excellent',
  good: 'reports.health.good',
  fair: 'reports.health.fair',
  attention: 'reports.health.attention'
}

const bandDescKey: Record<HealthBand, TranslationKey> = {
  excellent: 'reports.health.excellentDesc',
  good: 'reports.health.goodDesc',
  fair: 'reports.health.fairDesc',
  attention: 'reports.health.attentionDesc'
}

const statusCardStatus: Record<HealthBand, 'good' | 'warning' | 'critical'> = {
  excellent: 'good',
  good: 'good',
  fair: 'warning',
  attention: 'critical'
}

export function ReportsPage(): React.ReactElement {
  const { t } = useTranslation()
  const access = useFeatureAccess('cleanup_reports')
  const { history, hydrated, animateKey, hasHistory, analytics, clearHistory } =
    useReportsHistory()

  async function handleClear(): Promise<void> {
    if (!access.guard()) return
    const confirm = await electronService.dialog().message({
      type: 'question',
      title: t('reports.clearConfirmTitle'),
      message: t('reports.clearConfirmMessage'),
      buttons: [t('reports.clearCancel'), t('reports.clearConfirm')]
    })
    if (confirm.response === 1) {
      clearHistory()
    }
  }

  const heroPhase = useMemo((): ReportsHeroPhase => {
    if (!access.allowed) return 'locked'
    if (!hasHistory || !analytics) return 'empty'
    return 'ready'
  }, [access.allowed, hasHistory, analytics])

  const healthBand = analytics?.healthBand ?? 'fair'

  const { heroTitle, heroMessage } = useMemo(() => {
    if (!access.allowed) {
      return {
        heroTitle: t('reports.hero.lockedTitle'),
        heroMessage: t('reports.hero.lockedMsg')
      }
    }
    if (!hasHistory || !analytics) {
      return {
        heroTitle: t('reports.empty.title'),
        heroMessage: t('reports.empty.desc')
      }
    }
    return {
      heroTitle: t(bandTitleKey[analytics.healthBand]),
      heroMessage: t(bandDescKey[analytics.healthBand])
    }
  }, [access.allowed, hasHistory, analytics, t])

  const spaceLabel = analytics
    ? formatBytes(analytics.lifetimeBytesFreed)
    : access.allowed
      ? '—'
      : '—'
  const optimizationsLabel = analytics ? String(analytics.optimizations) : '—'
  const scansLabel = analytics ? String(analytics.totals.scanCount) : '—'

  const activityHint = useMemo(() => {
    if (!access.allowed) return t('reports.hero.hint')
    if (!hasHistory || !analytics) return t('reports.hero.noActivityYet')
    if (analytics.lastActivityAt) {
      return t('reports.hero.lastActivity', {
        when: formatRelativeScanTime(analytics.lastActivityAt)
      })
    }
    return t('reports.hero.hint')
  }, [access.allowed, hasHistory, analytics, t])

  const statusCard = useMemo(() => {
    if (!analytics) return null
    return {
      icon:
        analytics.healthBand === 'excellent' || analytics.healthBand === 'good'
          ? Sparkles
          : analytics.healthBand === 'fair'
            ? FileBarChart2
            : CheckCircle2,
      status: statusCardStatus[analytics.healthBand],
      title: t(bandTitleKey[analytics.healthBand]),
      message: t(bandDescKey[analytics.healthBand])
    }
  }, [analytics, t])

  return (
    <div className="space-y-6 p-content-pad">
      <FeatureLockedCallout feature="cleanup_reports" />

      {!hydrated ? (
        <ReportsSkeleton />
      ) : (
        <>
          <ReportsHero
            phase={heroPhase}
            healthBand={healthBand}
            title={heroTitle}
            message={heroMessage}
            healthScore={analytics?.healthScore ?? null}
            spaceLabel={spaceLabel}
            optimizationsLabel={optimizationsLabel}
            scansLabel={scansLabel}
            activityHint={activityHint}
            showClear={access.allowed && hasHistory}
            onClear={() => void handleClear()}
            animateKey={animateKey}
          />

          {access.allowed && statusCard ? (
            <StatusCard
              icon={statusCard.icon}
              title={statusCard.title}
              status={statusCard.status}
              message={statusCard.message}
            />
          ) : null}

          {!access.allowed ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileBarChart2 className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  {t('entitlements.feature.cleanup_reports')}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('entitlements.feature.cleanup_reportsDesc')}
                </p>
              </div>
            </div>
          ) : !hasHistory || !analytics ? (
            <ReportsEmptyState />
          ) : (
            <>
              <ReportsInsightGrid analytics={analytics} animateKey={animateKey} />
              <ReportsLastScanCard analytics={analytics} />
              <ReportsChartsSection analytics={analytics} />
              <ActivityTimeline entries={history.entries} />
            </>
          )}
        </>
      )}
    </div>
  )
}

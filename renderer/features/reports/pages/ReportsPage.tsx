import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { electronService } from '@/services/electron-service'
import { useReportsHistory } from '@/features/reports/hooks/useReportsHistory'
import { ReportsHealthOverview } from '@/features/reports/components/ReportsHealthOverview'
import { ReportsInsightGrid } from '@/features/reports/components/ReportsInsightGrid'
import { ReportsChartsSection } from '@/features/reports/components/ReportsChartsSection'
import { ActivityTimeline } from '@/features/reports/components/ActivityTimeline'
import { ReportsEmptyState } from '@/features/reports/components/ReportsEmptyState'
import { ReportsSkeleton } from '@/features/reports/components/ReportsSkeleton'
import { useTranslation } from '@/i18n/useTranslation'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { FeatureLockedCallout } from '@/features/entitlements/components/FeatureLockedCallout'
import { FeatureLockButton } from '@/features/entitlements/components/FeatureLockButton'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { cn } from '@/utils/cn'

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

  return (
    <>
      <Toolbar
        title={t('reports.title')}
        description={t('reports.description')}
        actions={
          <div className="flex items-center gap-2">
            {!access.allowed ? <PremiumBadge plan="premium" /> : null}
            {hasHistory ? (
              <FeatureLockButton
                feature="cleanup_reports"
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg px-3 text-[13px]"
                onClick={() => void handleClear()}
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                {t('reports.clear')}
              </FeatureLockButton>
            ) : undefined}
          </div>
        }
      />

      <div className="space-y-8 p-content-pad">
        <FeatureLockedCallout feature="cleanup_reports" />
        {!hydrated ? (
          <ReportsSkeleton />
        ) : !access.allowed ? (
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border border-border bg-card',
              'min-h-[280px]'
            )}
          >
            <div className="pointer-events-none select-none p-6 opacity-40 blur-[1.5px]" aria-hidden="true">
              <ReportsEmptyState />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/40 p-6">
              <div className="max-w-sm text-center">
                <p className="text-sm font-semibold text-foreground">
                  {t('entitlements.feature.cleanup_reports')}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('entitlements.feature.cleanup_reportsDesc')}
                </p>
                <Button
                  size="sm"
                  className="mt-4 h-9"
                  onClick={access.requestUpgrade}
                >
                  {t('entitlements.prompt.upgrade')}
                </Button>
              </div>
            </div>
          </div>
        ) : !hasHistory || !analytics ? (
          <ReportsEmptyState />
        ) : (
          <>
            <ReportsHealthOverview analytics={analytics} animateKey={animateKey} />
            <ReportsInsightGrid analytics={analytics} animateKey={animateKey} />
            <ReportsChartsSection analytics={analytics} />
            <ActivityTimeline entries={history.entries} />
          </>
        )}
      </div>
    </>
  )
}

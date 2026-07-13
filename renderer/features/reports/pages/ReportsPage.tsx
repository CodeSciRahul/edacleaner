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

export function ReportsPage(): React.ReactElement {
  const { t } = useTranslation()
  const { history, hydrated, animateKey, hasHistory, analytics, clearHistory } =
    useReportsHistory()

  async function handleClear(): Promise<void> {
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
          hasHistory ? (
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg px-3 text-[13px]"
              onClick={() => void handleClear()}
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
              {t('reports.clear')}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-8 p-content-pad">
        {!hydrated ? (
          <ReportsSkeleton />
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

import { ScanSearch } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { useDashboardMetrics } from '@/features/home/hooks/useDashboardMetrics'
import { useReportsHistory } from '@/features/reports/hooks/useReportsHistory'
import { DashboardHero } from '@/features/home/components/DashboardHero'
import { DashboardLiveSnapshot } from '@/features/home/components/DashboardLiveSnapshot'
import { DashboardQuickActions } from '@/features/home/components/DashboardQuickActions'
import { DashboardProgressTeaser } from '@/features/home/components/DashboardProgressTeaser'
import { DashboardTopProcesses } from '@/features/home/components/DashboardTopProcesses'
import { useTranslation } from '@/i18n/useTranslation'

export function HomePage(): React.ReactElement {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { metrics, isLoading } = useDashboardMetrics()
  const { analytics, hasHistory, hydrated } = useReportsHistory()

  return (
    <>
      <Toolbar
        title={t('home.title')}
        description={t('home.description')}
        actions={
          <Button
            size="sm"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => navigate('/smart-scan')}
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            {t('home.scanNow')}
          </Button>
        }
      />

      <div className="space-y-7 p-content-pad">
        <DashboardHero
          analytics={analytics}
          hasHistory={hasHistory}
          cpu={metrics?.cpu ?? null}
          ram={metrics?.ram ?? null}
        />

        <DashboardLiveSnapshot metrics={metrics} isLoading={isLoading} />

        <DashboardQuickActions />

        <DashboardProgressTeaser
          analytics={analytics}
          hasHistory={hasHistory}
          hydrated={hydrated}
        />

        <DashboardTopProcesses
          processes={metrics?.topProcesses ?? []}
          isLoading={isLoading}
        />
      </div>
    </>
  )
}

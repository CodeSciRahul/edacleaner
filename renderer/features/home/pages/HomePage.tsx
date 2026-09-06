import { useDashboardMetrics } from '@/features/home/hooks/useDashboardMetrics'
import { useReportsHistory } from '@/features/reports/hooks/useReportsHistory'
import { DashboardHero } from '@/features/home/components/DashboardHero'
import { DashboardLiveSnapshot } from '@/features/home/components/DashboardLiveSnapshot'
import { DashboardQuickActions } from '@/features/home/components/DashboardQuickActions'
import { DashboardProgressTeaser } from '@/features/home/components/DashboardProgressTeaser'
import { DashboardTopProcesses } from '@/features/home/components/DashboardTopProcesses'

export function HomePage(): React.ReactElement {
  const { metrics, isLoading } = useDashboardMetrics()
  const { analytics, hasHistory, hydrated } = useReportsHistory()

  return (
    <>
      <div className="space-y-7 p-content-pad">
        <DashboardHero
          analytics={analytics}
          hasHistory={hasHistory}
          cpu={metrics?.cpu ?? null}
          ram={metrics?.ram ?? null}
          diskFreeLabel={metrics?.diskFreeLabel ?? null}
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

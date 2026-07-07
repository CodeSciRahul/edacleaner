import { BarChart3, Trash2, HardDrive, Zap, ScanSearch } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Toolbar } from '@/components/desktop/Toolbar'
import { MetricCard } from '@/components/desktop/MetricCard'
import { PerformanceGraph } from '@/components/desktop/PerformanceGraph'
import { cn } from '@/utils/cn'

interface ReportEntry {
  id: string
  type: 'cleanup' | 'scan' | 'storage' | 'performance'
  title: string
  date: string
  duration: string
  result: string
  icon: LucideIcon
}

const reportSummary = {
  totalCleanups: 24,
  spaceRecovered: '18.4 GB',
  avgBootImprovement: '9 sec',
  lastScan: '2 hours ago'
}

const reportHistory: ReportEntry[] = [
  {
    id: '1',
    type: 'cleanup',
    title: 'Full Cleanup',
    date: 'Jul 6, 2026 · 2:14 PM',
    duration: '1m 42s',
    result: '2.3 GB recovered',
    icon: Trash2
  },
  {
    id: '2',
    type: 'scan',
    title: 'Smart Scan',
    date: 'Jul 5, 2026 · 9:30 AM',
    duration: '3m 08s',
    result: '4 issues found',
    icon: ScanSearch
  },
  {
    id: '3',
    type: 'storage',
    title: 'Duplicate Removal',
    date: 'Jul 3, 2026 · 6:45 PM',
    duration: '4m 21s',
    result: '840 MB recovered',
    icon: HardDrive
  },
  {
    id: '4',
    type: 'performance',
    title: 'Startup Optimization',
    date: 'Jul 1, 2026 · 8:00 AM',
    duration: '48s',
    result: 'Boot time −12 sec',
    icon: Zap
  },
  {
    id: '5',
    type: 'cleanup',
    title: 'Browser Cache Clean',
    date: 'Jun 28, 2026 · 11:20 AM',
    duration: '22s',
    result: '620 MB recovered',
    icon: Trash2
  }
]

const spaceRecoveredTrend = [
  { label: 'Mon', value: 1.2 },
  { label: 'Tue', value: 0.4 },
  { label: 'Wed', value: 2.1 },
  { label: 'Thu', value: 0.8 },
  { label: 'Fri', value: 1.6 },
  { label: 'Sat', value: 3.2 },
  { label: 'Sun', value: 2.3 }
]

const typeStyles: Record<ReportEntry['type'], string> = {
  cleanup: 'bg-primary/10 text-primary',
  scan: 'bg-chart-ram/10 text-chart-ram',
  storage: 'bg-chart-disk/10 text-chart-disk',
  performance: 'bg-warning/10 text-warning'
}

export function ReportsPage(): React.ReactElement {
  return (
    <>
      <Toolbar
        title="Reports"
        description="History and insights from scans, cleanups, and optimizations."
      />

      <div className="space-y-6 p-content-pad">
        <section aria-label="Report summary">
          <h2 className="mb-4 text-section-title text-foreground">Summary</h2>
          <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={BarChart3}
              title="Total Cleanups"
              description="All time"
              value={String(reportSummary.totalCleanups)}
            />
            <MetricCard
              icon={HardDrive}
              title="Space Recovered"
              description="All time"
              value={reportSummary.spaceRecovered}
            />
            <MetricCard
              icon={Zap}
              title="Boot Improvement"
              description="Average gain"
              value={reportSummary.avgBootImprovement}
            />
            <MetricCard
              icon={ScanSearch}
              title="Last Scan"
              description="Most recent activity"
              value={reportSummary.lastScan}
            />
          </div>
        </section>

        <PerformanceGraph
          title="Space Recovered This Week (GB)"
          data={spaceRecoveredTrend}
          color="disk"
        />

        <section aria-label="Report history">
          <h2 className="mb-4 text-section-title text-foreground">Activity History</h2>
          <div className="rounded-xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {reportHistory.map((entry) => {
                const Icon = entry.icon

                return (
                  <li key={entry.id} className="flex items-center gap-4 px-4 py-4">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                        typeStyles[entry.type]
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">{entry.date}</p>
                    </div>

                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-sm font-medium text-foreground">{entry.result}</p>
                      <p className="text-xs text-muted-foreground">{entry.duration}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      </div>
    </>
  )
}

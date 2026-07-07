import { ScanSearch, Trash2, Cpu, HardDrive } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { MetricCard } from '@/components/desktop/MetricCard'
import { StatusCard } from '@/components/desktop/StatusCard'
import { PerformanceGraph } from '@/components/desktop/PerformanceGraph'
import { TopProcessesTable } from '@/components/desktop/TopProcessesTable'
import { useDashboardMetrics } from '@/features/home/hooks/useDashboardMetrics'

const performanceData = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? '0s' : i === 23 ? '60s' : '',
  value: 20 + Math.sin(i / 3) * 15 + Math.random() * 10
}))

const topProcesses = [
  { name: 'Chrome', cpu: 12.4 },
  { name: 'VS Code', cpu: 8.2 },
  { name: 'Spotify', cpu: 4.1 },
  { name: 'Explorer', cpu: 2.8 }
]

export function HomePage(): React.ReactElement {
  const navigate = useNavigate()
  const { metrics, isLoading } = useDashboardMetrics()

  return (
    <>
      <Toolbar
        title="System Overview"
        description="Monitor performance and run quick optimizations."
        actions={
          <Button
            size="sm"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => navigate('/smart-scan')}
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            Scan Now
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        <StatusCard
          icon={ScanSearch}
          title="System Health"
          status="good"
          message="Your PC is running well. No critical issues detected."
        />

        <section aria-label="System metrics">
          <h2 className="mb-4 text-section-title text-foreground">Live Metrics</h2>
          {isLoading || !metrics ? (
            <div className="grid grid-cols-2 gap-grid-gap lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-grid-gap lg:grid-cols-5">
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.cpu} color="cpu" label="CPU" size={100} />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.ram} color="ram" label="RAM" size={100} />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.disk} color="disk" label="Disk" size={100} />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card">
                <CircularProgress value={metrics.battery} color="battery" label="Battery" size={100} />
              </div>
              <div className="col-span-2 flex flex-col items-center rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-1">
                <CircularProgress value={metrics.network} color="network" label="Network" size={100} />
              </div>
            </div>
          )}
        </section>

        <section aria-label="Quick actions">
          <h2 className="mb-4 text-section-title text-foreground">Quick Actions</h2>
          <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Trash2}
              title="Junk Clean"
              description="Remove temporary and leftover files"
              value={metrics?.junkSize ?? '—'}
              actionLabel="Clean Now"
              onAction={() => navigate('/cleanup')}
            />
            <MetricCard
              icon={Cpu}
              title="Boost RAM"
              description="Free memory from idle processes"
              value={metrics?.ramRecoverable ?? '—'}
              actionLabel="Optimize"
              onAction={() => navigate('/performance')}
            />
            <MetricCard
              icon={HardDrive}
              title="Startup Manager"
              description="Apps launching at boot"
              value={metrics ? `${metrics.startupCount} items` : '—'}
              actionLabel="Manage"
              onAction={() => navigate('/performance')}
            />
            <MetricCard
              icon={ScanSearch}
              title="Driver Update"
              description="Available driver updates"
              value={metrics ? `${metrics.driverUpdates} updates` : '—'}
              actionLabel="Update Now"
              onAction={() => navigate('/settings')}
            />
          </div>
        </section>

        <div className="grid gap-grid-gap xl:grid-cols-2">
          <PerformanceGraph title="Performance Monitor" data={performanceData} color="cpu" />
          <TopProcessesTable processes={topProcesses} />
        </div>
      </div>
    </>
  )
}

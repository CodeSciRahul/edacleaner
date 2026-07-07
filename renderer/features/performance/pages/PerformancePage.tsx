import { Zap, Power, Layers, Cpu, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toolbar } from '@/components/desktop/Toolbar'
import { StatusCard } from '@/components/desktop/StatusCard'
import { MetricCard } from '@/components/desktop/MetricCard'
import { PerformanceGraph } from '@/components/desktop/PerformanceGraph'
import { TopProcessesTable } from '@/components/desktop/TopProcessesTable'
import { cn } from '@/utils/cn'

const startupApps = [
  { name: 'Spotify', impact: 'High', enabled: true },
  { name: 'Discord', impact: 'Medium', enabled: true },
  { name: 'OneDrive', impact: 'Low', enabled: true },
  { name: 'Adobe Creative Cloud', impact: 'High', enabled: false },
  { name: 'Steam', impact: 'Medium', enabled: false }
]

const backgroundApps = [
  { name: 'Teams', status: 'Running', memory: '420 MB' },
  { name: 'Dropbox', status: 'Running', memory: '180 MB' },
  { name: 'Slack', status: 'Suspended', memory: '64 MB' },
  { name: 'Epic Games Launcher', status: 'Running', memory: '310 MB' }
]

const cpuHistory = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? '0s' : i === 23 ? '60s' : '',
  value: 35 + Math.sin(i / 2.5) * 20 + (i % 5) * 3
}))

const memoryHistory = Array.from({ length: 24 }, (_, i) => ({
  label: i === 0 ? '0s' : i === 23 ? '60s' : '',
  value: 55 + Math.cos(i / 3) * 12 + (i % 4) * 2
}))

const topProcesses = [
  { name: 'Chrome', cpu: 18.2 },
  { name: 'Code', cpu: 11.5 },
  { name: 'Explorer', cpu: 3.8 },
  { name: 'Spotify', cpu: 2.4 }
]

const impactStyles = {
  High: 'bg-destructive/10 text-destructive',
  Medium: 'bg-warning/10 text-warning',
  Low: 'bg-success/10 text-success'
}

export function PerformancePage(): React.ReactElement {
  return (
    <>
      <Toolbar
        title="Performance"
        description="Speed up your PC by managing startup and background activity."
        actions={
          <Button size="sm" className="h-9 gap-2 rounded-lg px-4 text-[13px]">
            <Zap className="h-4 w-4" aria-hidden="true" />
            Boost Now
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        <StatusCard
          icon={Zap}
          title="Performance Score: 78"
          status="warning"
          message="Disabling 2 high-impact startup apps could improve boot time by ~12 seconds."
        />

        <section aria-label="Performance summary">
          <h2 className="mb-4 text-section-title text-foreground">Summary</h2>
          <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Power}
              title="Startup Apps"
              description="Launch at boot"
              value="8 enabled"
              actionLabel="Manage"
              onAction={() => undefined}
            />
            <MetricCard
              icon={Layers}
              title="Background Apps"
              description="Running in background"
              value="14 active"
              actionLabel="Review"
              onAction={() => undefined}
            />
            <MetricCard
              icon={Cpu}
              title="Recoverable RAM"
              description="From idle processes"
              value="1.2 GB"
              actionLabel="Free Memory"
              onAction={() => undefined}
            />
            <MetricCard
              icon={Activity}
              title="Boot Time"
              description="Last restart"
              value="42 sec"
              actionLabel="View History"
              onAction={() => undefined}
            />
          </div>
        </section>

        <div className="grid gap-grid-gap xl:grid-cols-2">
          <PerformanceGraph title="CPU Usage (60s)" data={cpuHistory} color="cpu" />
          <PerformanceGraph title="Memory Usage (60s)" data={memoryHistory} color="ram" />
        </div>

        <div className="grid gap-grid-gap xl:grid-cols-2">
          <section aria-label="Startup apps">
            <h2 className="mb-4 text-section-title text-foreground">Startup Apps</h2>
            <div className="rounded-xl border border-border bg-card shadow-card">
              <ul className="divide-y divide-border">
                {startupApps.map((app) => (
                  <li key={app.name} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{app.name}</p>
                      <Badge
                        className={cn('mt-1 border-0', impactStyles[app.impact as keyof typeof impactStyles])}
                      >
                        {app.impact} impact
                      </Badge>
                    </div>
                    <span
                      className={cn(
                        'ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        app.enabled
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {app.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-label="Background apps">
            <h2 className="mb-4 text-section-title text-foreground">Background Apps</h2>
            <div className="rounded-xl border border-border bg-card shadow-card">
              <ul className="divide-y divide-border">
                {backgroundApps.map((app) => (
                  <li key={app.name} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.status}</p>
                    </div>
                    <span className="ml-4 shrink-0 text-sm tabular-nums text-muted-foreground">
                      {app.memory}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <TopProcessesTable processes={topProcesses} />
      </div>
    </>
  )
}

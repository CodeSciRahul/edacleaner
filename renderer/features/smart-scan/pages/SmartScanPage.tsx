import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScanSearch,
  Sparkles,
  HardDrive,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toolbar } from '@/components/desktop/Toolbar'
import { StatusCard } from '@/components/desktop/StatusCard'
import { MetricCard } from '@/components/desktop/MetricCard'
import { cn } from '@/utils/cn'

interface ScanArea {
  id: string
  label: string
  description: string
  icon: LucideIcon
  status: 'good' | 'warning' | 'issue'
  finding: string
  href: string
}

const scanAreas: ScanArea[] = [
  {
    id: 'cleanup',
    label: 'Cleanup',
    description: 'Junk files, temp data, and caches',
    icon: Sparkles,
    status: 'issue',
    finding: '5.9 GB reclaimable',
    href: '/cleanup'
  },
  {
    id: 'storage',
    label: 'Storage',
    description: 'Large files and duplicates',
    icon: HardDrive,
    status: 'warning',
    finding: '984 MB in duplicates',
    href: '/storage'
  },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Startup apps and background load',
    icon: Zap,
    status: 'warning',
    finding: '2 high-impact startup apps',
    href: '/performance'
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Privacy and system protections',
    icon: Shield,
    status: 'good',
    finding: 'No issues found',
    href: '/settings'
  }
]

const statusStyles = {
  good: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  issue: 'bg-destructive/10 text-destructive'
}

const statusLabels = {
  good: 'Good',
  warning: 'Review',
  issue: 'Action needed'
}

export function SmartScanPage(): React.ReactElement {
  const navigate = useNavigate()
  const [scanned, setScanned] = useState(false)

  const issuesFound = scanAreas.filter((area) => area.status !== 'good').length

  return (
    <>
      <Toolbar
        title="Smart Scan"
        description="One-click health check across junk, storage, and performance."
        actions={
          <Button
            size="sm"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => setScanned(true)}
          >
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            {scanned ? 'Rescan' : 'Start Smart Scan'}
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        {!scanned ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-8 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScanSearch className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="text-section-title text-foreground">Ready to scan</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Smart Scan checks cleanup, storage, performance, and security — then recommends
              the safest fixes first.
            </p>
            <Button className="mt-6" onClick={() => setScanned(true)}>
              Start Smart Scan
            </Button>
          </div>
        ) : (
          <>
            <StatusCard
              icon={issuesFound > 0 ? AlertTriangle : CheckCircle2}
              title={issuesFound > 0 ? `${issuesFound} areas need attention` : 'System is healthy'}
              status={issuesFound > 1 ? 'warning' : issuesFound === 1 ? 'warning' : 'good'}
              message={
                issuesFound > 0
                  ? 'Review the findings below and apply recommended fixes.'
                  : 'No critical issues detected. Your PC is running well.'
              }
            />

            <section aria-label="Scan summary">
              <h2 className="mb-4 text-section-title text-foreground">Scan Results</h2>
              <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={Sparkles}
                  title="Reclaimable Space"
                  value="5.9 GB"
                  actionLabel="Go to Cleanup"
                  onAction={() => navigate('/cleanup')}
                />
                <MetricCard
                  icon={HardDrive}
                  title="Duplicate Files"
                  value="984 MB"
                  actionLabel="Go to Storage"
                  onAction={() => navigate('/storage')}
                />
                <MetricCard
                  icon={Zap}
                  title="Boot Impact"
                  value="−12 sec"
                  actionLabel="Go to Performance"
                  onAction={() => navigate('/performance')}
                />
                <MetricCard
                  icon={ScanSearch}
                  title="Scan Duration"
                  value="3m 08s"
                />
              </div>
            </section>

            <section aria-label="Scan areas">
              <h2 className="mb-4 text-section-title text-foreground">Areas Checked</h2>
              <div className="space-y-3">
                {scanAreas.map((area) => {
                  const Icon = area.icon

                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => navigate(area.href)}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left',
                        'outline-none transition-all duration-150 ease-out',
                        'hover:border-primary/30 hover:bg-accent/30',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          statusStyles[area.status]
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{area.label}</p>
                          <Badge
                            variant="outline"
                            className={cn('border-0', statusStyles[area.status])}
                          >
                            {statusLabels[area.status]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{area.description}</p>
                      </div>

                      <p className="shrink-0 text-sm font-medium text-foreground">{area.finding}</p>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  )
}

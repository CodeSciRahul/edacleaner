import { HardDrive, FileStack, Copy, PieChart } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { MetricCard } from '@/components/desktop/MetricCard'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { cn } from '@/utils/cn'

const driveInfo = {
  label: 'Local Disk (C:)',
  used: 312,
  total: 512,
  usedLabel: '312 GB used',
  freeLabel: '200 GB free'
}

const storageBreakdown = [
  { label: 'Applications', size: '98 GB', pct: 31, color: 'bg-primary' },
  { label: 'Documents', size: '64 GB', pct: 21, color: 'bg-chart-ram' },
  { label: 'Media', size: '82 GB', pct: 26, color: 'bg-chart-disk' },
  { label: 'System', size: '48 GB', pct: 15, color: 'bg-chart-battery' },
  { label: 'Other', size: '20 GB', pct: 7, color: 'bg-muted-foreground' }
]

const largeFiles = [
  { name: 'project-backup.zip', path: 'Downloads', size: '4.2 GB' },
  { name: 'screen-recording-2026.mp4', path: 'Videos', size: '2.8 GB' },
  { name: 'node_modules.tar', path: 'Projects', size: '1.6 GB' },
  { name: 'game-installer.exe', path: 'Downloads', size: '1.1 GB' }
]

const duplicateGroups = [
  { name: 'vacation-photos', copies: 12, size: '840 MB' },
  { name: 'report-final.pdf', copies: 4, size: '96 MB' },
  { name: 'presentation.pptx', copies: 3, size: '48 MB' }
]

export function StoragePage(): React.ReactElement {
  const usedPct = Math.round((driveInfo.used / driveInfo.total) * 100)

  return (
    <>
      <Toolbar
        title="Storage"
        description="Free up disk space and find what's using it."
        actions={
          <Button size="sm" className="h-9 gap-2 rounded-lg px-4 text-[13px]">
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            Analyze Disk
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        <section aria-label="Drive overview">
          <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-center sm:flex-row sm:gap-6">
              <CircularProgress
                value={usedPct}
                color="disk"
                label={driveInfo.label}
                size={120}
              />
              <div className="text-center sm:text-left">
                <p className="text-card-title font-medium text-foreground">{driveInfo.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {driveInfo.usedLabel} of {driveInfo.total} GB
                </p>
                <p className="mt-0.5 text-sm font-medium text-success">{driveInfo.freeLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Storage summary">
          <h2 className="mb-4 text-section-title text-foreground">Overview</h2>
          <div className="grid gap-grid-gap sm:grid-cols-3">
            <MetricCard
              icon={FileStack}
              title="Large Files"
              description="Files over 500 MB"
              value="9.7 GB"
              actionLabel="Review"
              onAction={() => undefined}
            />
            <MetricCard
              icon={Copy}
              title="Duplicates"
              description="Identical file copies"
              value="984 MB"
              actionLabel="Find Duplicates"
              onAction={() => undefined}
            />
            <MetricCard
              icon={PieChart}
              title="Reclaimable"
              description="Safe to remove"
              value="3.4 GB"
              actionLabel="Clean Up"
              onAction={() => undefined}
            />
          </div>
        </section>

        <div className="grid gap-grid-gap xl:grid-cols-2">
          <section aria-label="Storage breakdown">
            <h2 className="mb-4 text-section-title text-foreground">Disk Usage</h2>
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-muted">
                {storageBreakdown.map((segment) => (
                  <div
                    key={segment.label}
                    className={cn(segment.color, 'h-full')}
                    style={{ width: `${segment.pct}%` }}
                    title={`${segment.label}: ${segment.size}`}
                  />
                ))}
              </div>
              <ul className="space-y-3">
                {storageBreakdown.map((segment) => (
                  <li key={segment.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', segment.color)} />
                      <span className="text-foreground">{segment.label}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">{segment.size}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section aria-label="Large files">
            <h2 className="mb-4 text-section-title text-foreground">Largest Files</h2>
            <div className="rounded-xl border border-border bg-card shadow-card">
              <ul className="divide-y divide-border">
                {largeFiles.map((file) => (
                  <li key={file.name} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.path}</p>
                    </div>
                    <span className="ml-4 shrink-0 text-sm tabular-nums text-muted-foreground">
                      {file.size}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <section aria-label="Duplicate files">
          <h2 className="mb-4 text-section-title text-foreground">Duplicate Groups</h2>
          <div className="rounded-xl border border-border bg-card shadow-card">
            <ul className="divide-y divide-border">
              {duplicateGroups.map((group) => (
                <li key={group.name} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                    <p className="text-xs text-muted-foreground">{group.copies} duplicate copies</p>
                  </div>
                  <span className="ml-4 shrink-0 text-sm tabular-nums text-muted-foreground">
                    {group.size}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </>
  )
}

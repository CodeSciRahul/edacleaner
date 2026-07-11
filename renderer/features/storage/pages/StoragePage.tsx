import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardDrive, FileStack, Copy, PieChart, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { MetricCard } from '@/components/desktop/MetricCard'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import {
  useAnalyzeStorage,
  useDuplicates,
  useLargeFiles,
  useStorageDrives,
  useStorageUsage
} from '@/features/storage/hooks/useStorageData'
import { StorageSubnav } from '@/features/storage/components/StorageSubnav'

const SEGMENT_COLORS = [
  'bg-primary',
  'bg-chart-ram',
  'bg-chart-disk',
  'bg-chart-battery',
  'bg-muted-foreground',
  'bg-chart-cpu'
]

export function StoragePage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: drives = [], isLoading: drivesLoading } = useStorageDrives()
  const [selectedMount, setSelectedMount] = useState<string | undefined>(undefined)

  const activeDrive = useMemo(() => {
    if (drives.length === 0) return undefined
    if (selectedMount) {
      return drives.find((drive) => drive.mountPath === selectedMount) ?? drives[0]
    }
    return drives[0]
  }, [drives, selectedMount])

  const mountPath = activeDrive?.mountPath
  const { data: usage, isLoading: usageLoading } = useStorageUsage(mountPath, Boolean(mountPath))
  const { data: largeFiles = [], isLoading: largeLoading } = useLargeFiles()
  const { data: duplicates = [], isLoading: duplicatesLoading } = useDuplicates()
  const analyze = useAnalyzeStorage()

  const usedPct = activeDrive
    ? Math.round((activeDrive.usedBytes / Math.max(activeDrive.totalBytes, 1)) * 100)
    : 0

  const largeTotalBytes = largeFiles.reduce((sum, file) => sum + file.sizeBytes, 0)
  const duplicateWasteBytes = duplicates.reduce(
    (sum, group) => sum + group.sizeBytes * Math.max(0, group.copies - 1),
    0
  )

  const segments = (usage?.segments ?? []).map((segment, index) => ({
    ...segment,
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    sizeLabel: formatBytes(segment.bytes)
  }))

  const isAnalyzing =
    analyze.isPending || drivesLoading || usageLoading || largeLoading || duplicatesLoading

  return (
    <>
      <Toolbar
        title="Storage"
        description="Free up disk space and find what's using it."
        actions={
          <Button
            size="sm"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            onClick={() => void analyze.mutateAsync(mountPath)}
            disabled={isAnalyzing}
          >
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            {analyze.isPending ? 'Analyzing…' : 'Analyze Disk'}
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        {/* <StorageSubnav /> */}

        <section aria-label="Drive overview">
          <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col items-center sm:flex-row sm:gap-6">
              <CircularProgress
                value={usedPct}
                color="disk"
                label={activeDrive?.label ?? 'Disk'}
                size={120}
              />
              <div className="text-center sm:text-left">
                <p className="text-card-title font-medium text-foreground">
                  {activeDrive?.label ?? (drivesLoading ? 'Loading drive…' : 'No drive found')}
                </p>
                {activeDrive ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatBytes(activeDrive.usedBytes)} used of{' '}
                      {formatBytes(activeDrive.totalBytes)}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-success">
                      {formatBytes(activeDrive.freeBytes)} free
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Connect a drive or refresh analysis.
                  </p>
                )}
              </div>
            </div>

            {drives.length > 1 ? (
              <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                {drives.map((drive) => (
                  <Button
                    key={drive.mountPath}
                    size="sm"
                    variant={drive.mountPath === mountPath ? 'default' : 'outline'}
                    className="h-8 rounded-lg text-[12px]"
                    title={drive.mountPath}
                    onClick={() => setSelectedMount(drive.mountPath)}
                  >
                    {drive.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section aria-label="Storage summary">
          <h2 className="mb-4 text-section-title text-foreground">Overview</h2>
          <div className="grid gap-grid-gap sm:grid-cols-3">
            <MetricCard
              icon={FileStack}
              title="Large Files"
              description="Files over 100 MB"
              value={largeLoading ? '…' : formatBytes(largeTotalBytes)}
              actionLabel="Open Large Files"
              onAction={() => navigate('/storage/large-files')}
            />
            <MetricCard
              icon={Copy}
              title="Duplicates"
              description="Identical file copies"
              value={duplicatesLoading ? '…' : formatBytes(duplicateWasteBytes)}
              actionLabel="Open Duplicates"
              onAction={() => navigate('/storage/duplicates')}
            />
            <MetricCard
              icon={PieChart}
              title="Reclaimable"
              description="Safe duplicate waste"
              value={isAnalyzing && !duplicates.length ? '…' : formatBytes(duplicateWasteBytes)}
              actionLabel="Clean Up"
              onAction={() => navigate('/cleanup')}
            />
          </div>
        </section>

        <section aria-label="Storage breakdown">
          <h2 className="mb-4 text-section-title text-foreground">Disk Usage</h2>
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            {usageLoading ? (
              <p className="text-sm text-muted-foreground">Measuring folders…</p>
            ) : segments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Click Analyze Disk to build a usage breakdown.
              </p>
            ) : (
              <>
                <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-muted">
                  {segments.map((segment) => (
                    <div
                      key={segment.label}
                      className={cn(segment.color, 'h-full')}
                      style={{ width: `${segment.percent}%` }}
                      title={`${segment.label}: ${segment.sizeLabel}`}
                    />
                  ))}
                </div>
                <ul className="space-y-3">
                  {segments.map((segment) => (
                    <li
                      key={segment.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', segment.color)} />
                        <span className="text-foreground">{segment.label}</span>
                      </div>
                      <span className="tabular-nums text-muted-foreground">
                        {segment.sizeLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section aria-label="Quick links" className="grid gap-3 sm:grid-cols-2">
          <QuickLink
            title="Manage large files"
            description="Filter, select, and remove oversized files."
            onClick={() => navigate('/storage/large-files')}
          />
          <QuickLink
            title="Review duplicates"
            description="Keep one copy and reclaim wasted space."
            onClick={() => navigate('/storage/duplicates')}
          />
        </section>
      </div>
    </>
  )
}

function QuickLink({
  title,
  description,
  onClick
}: {
  title: string
  description: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left shadow-card transition-colors hover:bg-muted/40"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  )
}

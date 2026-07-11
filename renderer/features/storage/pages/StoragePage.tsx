import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardDrive, FileStack, Copy, PieChart, FolderOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { MetricCard } from '@/components/desktop/MetricCard'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import {
  useAnalyzeStorage,
  useDeleteFiles,
  useDuplicates,
  useLargeFiles,
  useRevealInFolder,
  useStorageDrives,
  useStorageUsage
} from '@/features/storage/hooks/useStorageData'

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
  const reveal = useRevealInFolder()
  const deleteFiles = useDeleteFiles()

  const usedPct = activeDrive
    ? Math.round((activeDrive.usedBytes / Math.max(activeDrive.totalBytes, 1)) * 100)
    : 0

  const largeTotalBytes = largeFiles.reduce((sum, file) => sum + file.sizeBytes, 0)
  const duplicateWasteBytes = duplicates.reduce(
    (sum, group) => sum + group.sizeBytes * Math.max(0, group.copies - 1),
    0
  )
  const reclaimableBytes = duplicateWasteBytes

  const segments = (usage?.segments ?? []).map((segment, index) => ({
    ...segment,
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
    sizeLabel: formatBytes(segment.bytes)
  }))

  const isAnalyzing =
    analyze.isPending || drivesLoading || usageLoading || largeLoading || duplicatesLoading

  const handleAnalyze = (): void => {
    void analyze.mutateAsync(mountPath)
  }

  const handleDeleteLargeFile = (filePath: string): void => {
    void deleteFiles.mutateAsync([filePath])
  }

  const handleDeleteDuplicateGroup = (paths: string[]): void => {
    // Keep one copy; trash the extras
    const extras = paths.slice(1)
    if (extras.length === 0) return
    void deleteFiles.mutateAsync(extras)
  }

  return (
    <>
      <Toolbar
        title="Storage"
        description="Free up disk space and find what's using it."
        actions={
          <Button
            size="sm"
            className="h-9 gap-2 rounded-lg px-4 text-[13px]"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <HardDrive className="h-4 w-4" aria-hidden="true" />
            {analyze.isPending ? 'Analyzing…' : 'Analyze Disk'}
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
              actionLabel="Review"
              onAction={() => {
                document.getElementById('largest-files')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
            <MetricCard
              icon={Copy}
              title="Duplicates"
              description="Identical file copies"
              value={duplicatesLoading ? '…' : formatBytes(duplicateWasteBytes)}
              actionLabel="Find Duplicates"
              onAction={() => {
                void analyze.mutateAsync(mountPath)
                document.getElementById('duplicate-groups')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
            <MetricCard
              icon={PieChart}
              title="Reclaimable"
              description="Safe to remove"
              value={isAnalyzing && !duplicates.length ? '…' : formatBytes(reclaimableBytes)}
              actionLabel="Clean Up"
              onAction={() => navigate('/cleanup')}
            />
          </div>
        </section>

        <div className="grid gap-grid-gap xl:grid-cols-2">
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

          <section id="largest-files" aria-label="Large files">
            <h2 className="mb-4 text-section-title text-foreground">Largest Files</h2>
            <div className="rounded-xl border border-border bg-card shadow-card">
              {largeLoading ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">Scanning large files…</p>
              ) : largeFiles.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  No files over 100 MB found in your user folder.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {largeFiles.map((file) => (
                    <li
                      key={file.path}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{file.path}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatBytes(file.sizeBytes)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          aria-label={`Show ${file.name} in folder`}
                          onClick={() => reveal.mutate(file.path)}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive"
                          aria-label={`Delete ${file.name}`}
                          disabled={deleteFiles.isPending}
                          onClick={() => handleDeleteLargeFile(file.path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section id="duplicate-groups" aria-label="Duplicate files">
          <h2 className="mb-4 text-section-title text-foreground">Duplicate Groups</h2>
          <div className="rounded-xl border border-border bg-card shadow-card">
            {duplicatesLoading ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">Looking for duplicates…</p>
            ) : duplicates.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No duplicate groups found in your user folder.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {duplicates.map((group) => (
                  <li
                    key={`${group.name}-${group.paths[0]}`}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.copies} duplicate copies · {formatBytes(group.sizeBytes)} each
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatBytes(group.sizeBytes * Math.max(0, group.copies - 1))} waste
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        aria-label={`Show ${group.name} in folder`}
                        onClick={() => reveal.mutate(group.paths[0])}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive"
                        aria-label={`Remove duplicate copies of ${group.name}`}
                        disabled={deleteFiles.isPending}
                        onClick={() => handleDeleteDuplicateGroup(group.paths)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

import { ArrowRight, Copy, FileStack, PieChart } from 'lucide-react'
import { MetricCard } from '@/components/desktop/MetricCard'
import { formatBytes } from '@shared/utils'

interface StorageInsightsSectionProps {
  largeTotalBytes: number
  duplicateWasteBytes: number
  largeLoading: boolean
  duplicatesLoading: boolean
  analyzing: boolean
  hasDuplicates: boolean
  onOpenLargeFiles: () => void
  onOpenDuplicates: () => void
  onCleanup: () => void
}

export function StorageInsightsSection({
  largeTotalBytes,
  duplicateWasteBytes,
  largeLoading,
  duplicatesLoading,
  analyzing,
  hasDuplicates,
  onOpenLargeFiles,
  onOpenDuplicates,
  onCleanup
}: StorageInsightsSectionProps): React.ReactElement {
  return (
    <div className="space-y-6">
      <section aria-label="Storage insights">
        <h2 className="mb-4 text-section-title text-foreground">Storage insights</h2>
        <div className="grid gap-grid-gap sm:grid-cols-3">
          <MetricCard
            icon={FileStack}
            title="Large Files"
            description="Files over 100 MB"
            value={largeLoading ? '…' : formatBytes(largeTotalBytes)}
            actionLabel="Open Large Files"
            onAction={onOpenLargeFiles}
          />
          <MetricCard
            icon={Copy}
            title="Duplicates"
            description="Identical file copies"
            value={duplicatesLoading ? '…' : formatBytes(duplicateWasteBytes)}
            actionLabel="Open Duplicates"
            onAction={onOpenDuplicates}
          />
          <MetricCard
            icon={PieChart}
            title="Reclaimable"
            description="Safe duplicate waste"
            value={analyzing && !hasDuplicates ? '…' : formatBytes(duplicateWasteBytes)}
            actionLabel="Clean Up"
            onAction={onCleanup}
          />
        </div>
      </section>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          title="Manage large files"
          description="Filter, select, and remove oversized files."
          onClick={onOpenLargeFiles}
        />
        <QuickLink
          title="Review duplicates"
          description="Keep one copy and reclaim wasted space."
          onClick={onOpenDuplicates}
        />
      </section>
    </div>
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
      className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-card-hover"
    >
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  )
}

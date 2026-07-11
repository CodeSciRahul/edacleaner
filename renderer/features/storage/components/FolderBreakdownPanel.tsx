import { FolderOpen, FolderTree } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { StorageSegment } from '@shared/interfaces'
import { colors } from '@/theme/colors'
import {
  FolderBreakdownChart,
  type BreakdownChartSegment
} from './FolderBreakdownChart'

/** Hex palette for charts + legend swatches (not Tailwind class names). */
export const SEGMENT_PALETTE = [
  colors.chart.cpu,
  colors.chart.ram,
  colors.chart.disk,
  colors.chart.battery,
  colors.chart.network,
  '#EC4899',
  '#14B8A6',
  '#A855F7',
  '#F97316',
  '#64748B'
] as const

interface FolderBreakdownPanelProps {
  driveLabel?: string
  mountPath?: string
  segments: BreakdownChartSegment[]
  isLoading: boolean
  onOpenCategory?: (segment: BreakdownChartSegment) => void
}

export function buildSegmentColors(
  segments: StorageSegment[],
  formatBytes: (n: number) => string
): BreakdownChartSegment[] {
  return segments.map((segment, index) => ({
    ...segment,
    color: SEGMENT_PALETTE[index % SEGMENT_PALETTE.length],
    sizeLabel: formatBytes(segment.bytes),
    path: segment.path
  }))
}

export function FolderBreakdownPanel({
  driveLabel,
  mountPath,
  segments,
  isLoading,
  onOpenCategory
}: FolderBreakdownPanelProps): React.ReactElement {
  return (
    <section aria-label="Folder breakdown">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-section-title text-foreground">Folder breakdown</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {driveLabel
              ? `Where space goes on ${driveLabel}${mountPath ? ` · ${mountPath}` : ''} — click a category to open it`
              : 'Select a drive to see how folders use space.'}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="mx-auto h-[280px] w-[280px] animate-pulse rounded-full bg-muted/50" />
            <div className="space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          </div>
        ) : segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <FolderTree className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No folder data yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              No measurable folders were found on this drive. Try Analyze on the drive card, or
              pick another volume.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 p-4 lg:grid-cols-[minmax(240px,0.95fr)_minmax(0,1.15fr)] lg:gap-6 lg:p-6">
            <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-b from-muted/40 to-transparent p-2">
              <FolderBreakdownChart
                segments={segments}
                centerLabel={driveLabel?.split(' ')[0] ?? 'Drive'}
                onSegmentClick={(segment) => {
                  if (segment.path) onOpenCategory?.(segment)
                }}
              />
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Categories
                </p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {segments.length} items
                </p>
              </div>
              <ul className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
                {segments.map((segment, index) => {
                  const clickable = Boolean(segment.path && onOpenCategory)
                  return (
                    <li key={segment.label}>
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => {
                          if (segment.path) onOpenCategory?.(segment)
                        }}
                        className={cn(
                          'group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-left',
                          'transition-all duration-150',
                          clickable &&
                            'cursor-pointer hover:-translate-y-px hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          !clickable && 'cursor-default opacity-90'
                        )}
                        style={{ animationDelay: `${index * 40}ms` }}
                        title={
                          segment.path
                            ? `Open ${segment.path} in file manager`
                            : undefined
                        }
                      >
                        <span
                          className="h-9 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: segment.color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {segment.label}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              <p className="text-sm font-semibold tabular-nums text-foreground">
                                {segment.sizeLabel}
                              </p>
                              {clickable ? (
                                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${Math.min(100, segment.percent)}%`,
                                  backgroundColor: segment.color
                                }}
                              />
                            </div>
                            <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                              {segment.percent}%
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

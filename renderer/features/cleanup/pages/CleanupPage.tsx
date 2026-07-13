import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Square,
  CheckCheck
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { StatusCard } from '@/components/desktop/StatusCard'
import { formatBytes } from '@shared/utils'
import type { CleanupCategoryId, CleanupResult, CleanupScanResult } from '@shared/interfaces'
import {
  summarizeSelected,
  useCancelCleanup,
  useCleanupProgress,
  useRunCleanup,
  useScanCleanup
} from '@/features/cleanup/hooks/useCleanup'
import { CleanupHero } from '@/features/cleanup/components/CleanupHero'
import { CleanupStatsBar } from '@/features/cleanup/components/CleanupStatsBar'
import { CleanupCategoryCard } from '@/features/cleanup/components/CleanupCategoryCard'
import { CleanupProgressPanel } from '@/features/cleanup/components/CleanupProgressPanel'
import { CleanupResultsCard } from '@/features/cleanup/components/CleanupResultsCard'
import type { CleanupWorkflowPhase } from '@/features/cleanup/lib/category-meta'

export function CleanupPage(): React.ReactElement {
  const [scan, setScan] = useState<CleanupScanResult | null>(null)
  const [selected, setSelected] = useState<Set<CleanupCategoryId>>(new Set())
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null)
  const [selectionInitialized, setSelectionInitialized] = useState(false)

  const scanMutation = useScanCleanup()
  const runCleanup = useRunCleanup()
  const cancelCleanup = useCancelCleanup()

  const isScanning = scanMutation.isPending
  const isCleaning = runCleanup.isPending
  const progressActive = isScanning || isCleaning
  const progress = useCleanupProgress(progressActive)

  const phase: CleanupWorkflowPhase = useMemo(() => {
    if (isCleaning) return 'clean'
    if (isScanning) return 'scan'
    if (lastResult) return 'done'
    if (scan) return 'review'
    return 'idle'
  }, [isCleaning, isScanning, lastResult, scan])

  useEffect(() => {
    if (!scan || selectionInitialized) return
    const initial = new Set<CleanupCategoryId>()
    for (const category of scan.categories) {
      if (category.available && category.risk === 'safe') {
        initial.add(category.id)
      }
    }
    setSelected(initial)
    setSelectionInitialized(true)
  }, [scan, selectionInitialized])

  const summary = summarizeSelected(scan ?? undefined, selected)
  const availableCategories = scan?.categories.filter((c) => c.available) ?? []
  const busy = isScanning || isCleaning

  function toggleCategory(id: CleanupCategoryId): void {
    if (busy) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllSafe(): void {
    if (!scan || busy) return
    setSelected(
      new Set(
        scan.categories
          .filter((c) => c.available && c.risk === 'safe')
          .map((c) => c.id)
      )
    )
  }

  function clearSelection(): void {
    if (busy) return
    setSelected(new Set())
  }

  async function handleScan(): Promise<void> {
    setLastResult(null)
    setSelectionInitialized(false)
    try {
      const result = await scanMutation.mutateAsync()
      setScan(result)
    } catch {
      // error surfaced via scanMutation.error
    }
  }

  async function handleClean(): Promise<void> {
    if (selected.size === 0 || busy) return
    setLastResult(null)
    const payload = await runCleanup.mutateAsync({
      categories: [...selected]
    })
    if (!payload.cancelled && payload.result) {
      setLastResult(payload.result)
      setScan((prev) => {
        if (!prev) return prev
        const freedById = new Map(
          payload.result!.steps.map((step) => [step.id, step] as const)
        )
        const categories = prev.categories.map((category) => {
          const step = freedById.get(category.id)
          if (!step || (step.status !== 'completed' && step.status !== 'skipped')) {
            return category
          }
          if (category.id === 'recycle') {
            return {
              ...category,
              estimatedBytes: 0,
              estimatedFiles: 0
            }
          }
          return {
            ...category,
            estimatedBytes: Math.max(0, category.estimatedBytes - step.bytesFreed),
            estimatedFiles: Math.max(0, category.estimatedFiles - step.filesRemoved)
          }
        })
        return {
          ...prev,
          categories,
          totalBytes: categories.reduce((sum, c) => sum + c.estimatedBytes, 0),
          totalFiles: categories.reduce((sum, c) => sum + c.estimatedFiles, 0),
          scannedAt: Date.now()
        }
      })
    }
  }

  async function handleCancel(): Promise<void> {
    await cancelCleanup.mutateAsync()
  }

  const status = useMemo(() => {
    if (isScanning) {
      return {
        status: 'good' as const,
        title: 'Scanning for optimization…',
        message:
          progress?.message ?? 'Checking junk, temp files, caches, and Trash for reclaimable space.'
      }
    }
    if (isCleaning) {
      return {
        status: 'good' as const,
        title: 'Optimizing your PC…',
        message:
          progress?.message ?? 'Cleaning selected categories safely. Your personal files stay untouched.'
      }
    }
    if (scanMutation.isError) {
      return {
        status: 'critical' as const,
        title: 'Scan could not finish',
        message:
          scanMutation.error instanceof Error
            ? scanMutation.error.message
            : 'Please try again in a moment.'
      }
    }
    if (lastResult && !lastResult.cancelled) {
      const freed = lastResult.bytesFreed
      return {
        status: 'good' as const,
        title: freed > 0 ? 'Optimization complete' : 'System health improved',
        message:
          freed > 0
            ? `Storage successfully reclaimed — ${formatBytes(freed)} freed.`
            : 'Your PC is cleaner and ready. Everything looking good.'
      }
    }
    if (scan) {
      const hasWork =
        scan.totalBytes > 0 || availableCategories.some((c) => c.id === 'recycle')
      return {
        status: 'good' as const,
        title: hasWork ? 'Ready to optimize' : 'No action required',
        message: hasWork
          ? `Up to ${formatBytes(scan.totalBytes)} can be reclaimed across ${availableCategories.length} categories.`
          : 'Your system already looks tidy. Empty Trash anytime if you like.'
      }
    }
    return {
      status: 'good' as const,
      title: 'Ready when you are',
      message: 'Run a quick scan to find reclaimable space and boost system health.'
    }
  }, [
    isScanning,
    isCleaning,
    scanMutation.isError,
    scanMutation.error,
    lastResult,
    scan,
    availableCategories,
    progress?.message
  ])

  return (
    <>
      <Toolbar
        title="Cleanup"
        description="Optimize storage and keep your PC running clean."
        actions={
          <div className="flex items-center gap-2">
            {busy ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg px-3 text-[13px]"
                onClick={() => void handleCancel()}
                disabled={cancelCleanup.isPending}
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                Pause
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg px-3 text-[13px]"
                onClick={() => void handleScan()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {scan ? 'Rescan' : 'Scan'}
              </Button>
            )}
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              onClick={() => void handleClean()}
              disabled={busy || summary.count === 0 || !scan}
            >
              {isCleaning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              Optimize{summary.count > 0 ? ` (${summary.count})` : ''}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-content-pad">
        <CleanupHero
          phase={phase}
          reclaimableBytes={scan?.totalBytes ?? 0}
          selectedCount={summary.count}
          scanned={Boolean(scan)}
          lastBytesFreed={lastResult && !lastResult.cancelled ? lastResult.bytesFreed : undefined}
        />

        <StatusCard
          icon={
            scanMutation.isError
              ? AlertCircle
              : lastResult && !lastResult.cancelled
                ? CheckCircle2
                : Sparkles
          }
          title={status.title}
          status={status.status}
          message={status.message}
        />

        {progressActive && progress ? (
          <CleanupProgressPanel
            mode={isCleaning ? 'clean' : 'scan'}
            message={progress.message}
            percent={progress.percent}
            currentItem={progress.currentItem}
            bytesFreedSoFar={progress.bytesFreedSoFar}
            categoryId={progress.categoryId}
            categories={
              isCleaning
                ? (scan?.categories ?? [])
                    .filter((c) => selected.has(c.id))
                    .map((c) => ({ id: c.id, label: c.label }))
                : undefined
            }
          />
        ) : null}

        {scan ? (
          <CleanupStatsBar
            reclaimableBytes={summary.bytes > 0 ? summary.bytes : scan.totalBytes}
            fileCount={summary.files > 0 ? summary.files : scan.totalFiles}
            categoryCount={
              summary.count > 0 ? summary.count : availableCategories.length
            }
          />
        ) : null}

        {lastResult ? <CleanupResultsCard result={lastResult} /> : null}

        <section aria-label="Cleanup categories" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-section-title text-foreground">Categories</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose what to optimize. Safe categories are pre-selected after a scan.
              </p>
            </div>
            {scan && !busy ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
                  onClick={selectAllSafe}
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Select safe
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg px-2.5 text-xs"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            ) : null}
          </div>

          {!scan && !isScanning ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="max-w-sm space-y-1.5">
                <p className="text-sm font-semibold text-foreground">Start optimizing</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  A quick scan finds reclaimable junk, temp files, browser caches, and Trash —
                  then you choose what to clean.
                </p>
              </div>
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                onClick={() => void handleScan()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Start scan
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(scan?.categories ?? []).map((category) => (
                <CleanupCategoryCard
                  key={category.id}
                  category={category}
                  selected={selected.has(category.id)}
                  disabled={busy}
                  onToggle={() => toggleCategory(category.id)}
                />
              ))}
              {isScanning && !scan
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="h-[180px] animate-pulse rounded-2xl border border-border bg-muted/40"
                      aria-hidden="true"
                    />
                  ))
                : null}
            </div>
          )}
        </section>

        {scan && summary.count > 0 && !busy ? (
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/25 bg-card/95 px-4 py-3 shadow-lg backdrop-blur-md">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {summary.label} ready to reclaim
              </p>
              <p className="text-xs text-muted-foreground">
                {summary.count} categor{summary.count === 1 ? 'y' : 'ies'} selected
                {summary.files > 0 ? ` · ~${summary.files.toLocaleString()} items` : ''}
              </p>
            </div>
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              onClick={() => void handleClean()}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Optimize now
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}

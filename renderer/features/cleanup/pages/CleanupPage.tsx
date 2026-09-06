import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  CheckCheck
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
import { CleanupLoaderModal } from '@/features/cleanup/components/CleanupLoaderModal'
import { CleanupResultsCard } from '@/features/cleanup/components/CleanupResultsCard'
import type { CleanupWorkflowPhase } from '@/features/cleanup/lib/category-meta'
import { useSettingsStore } from '@/store/settings-store'
import { electronService } from '@/services/electron-service'
import { appendCleanupActivity } from '@/features/reports/lib/activity-history'
import { useTranslation } from '@/i18n/useTranslation'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'

export function CleanupPage(): React.ReactElement {
  const { t } = useTranslation()
  const tempAccess = useFeatureAccess('cleanup_temp')
  const [scan, setScan] = useState<CleanupScanResult | null>(null)
  const [selected, setSelected] = useState<Set<CleanupCategoryId>>(new Set())
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null)
  const [selectionInitialized, setSelectionInitialized] = useState(false)
  const autoSelectSafeCategories = useSettingsStore((s) => s.autoSelectSafeCategories)
  const showCompletionFeedback = useSettingsStore((s) => s.showCompletionFeedback)
  const confirmBeforeClean = useSettingsStore((s) => s.confirmBeforeClean)

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
    if (!autoSelectSafeCategories) {
      setSelected(new Set())
      setSelectionInitialized(true)
      return
    }
    const initial = new Set<CleanupCategoryId>()
    for (const category of scan.categories) {
      if (category.available && category.risk === 'safe') {
        if (category.id === 'temp' && !tempAccess.allowed) continue
        initial.add(category.id)
      }
    }
    setSelected(initial)
    setSelectionInitialized(true)
  }, [scan, selectionInitialized, autoSelectSafeCategories, tempAccess.allowed])

  const summary = summarizeSelected(scan ?? undefined, selected)
  const availableCategories = scan?.categories.filter((c) => c.available) ?? []
  const busy = isScanning || isCleaning

  function toggleCategory(id: CleanupCategoryId): void {
    if (busy) return
    if (id === 'temp' && !tempAccess.guard()) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllSafe(): void {
    if (!scan || busy) return
    const ids = scan.categories
      .filter((c) => c.available && c.risk === 'safe')
      .filter((c) => c.id !== 'temp' || tempAccess.allowed)
      .map((c) => c.id)
    setSelected(new Set(ids))
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
    if (selected.has('temp') && !tempAccess.guard()) return

    // Confirm before mutate so the loader never stacks under the dialog
    if (confirmBeforeClean) {
      const confirmed = await electronService.dialog().message({
        type: 'info',
        title: t('cleanup.confirm.title'),
        message:
          summary.count === 1
            ? t('cleanup.confirm.bodyOne')
            : t('cleanup.confirm.body', { count: summary.count }),
        detail: t('cleanup.confirm.detail'),
        buttons: [t('cleanup.confirm.notNow'), t('cleanup.confirm.confirm')]
      })
      if (confirmed.response !== 1) return
    }

    setLastResult(null)
    const payload = await runCleanup.mutateAsync({
      categories: [...selected]
    })
    if (!payload.cancelled && payload.result) {
      setLastResult(payload.result)
      appendCleanupActivity(payload.result)
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
        title: t('cleanup.status.scanningTitle'),
        message: progress?.message ?? t('cleanup.status.scanningMsg')
      }
    }
    if (isCleaning) {
      return {
        status: 'good' as const,
        title: t('cleanup.status.cleaningTitle'),
        message: progress?.message ?? t('cleanup.status.cleaningMsg')
      }
    }
    if (scanMutation.isError) {
      return {
        status: 'critical' as const,
        title: t('cleanup.status.scanErrorTitle'),
        message:
          scanMutation.error instanceof Error
            ? scanMutation.error.message
            : t('cleanup.status.scanErrorMsg')
      }
    }
    if (lastResult && !lastResult.cancelled) {
      const freed = lastResult.bytesFreed
      return {
        status: 'good' as const,
        title: freed > 0 ? t('cleanup.status.completeTitle') : t('cleanup.status.improvedTitle'),
        message:
          freed > 0
            ? t('cleanup.status.completeMsg', { bytes: formatBytes(freed) })
            : t('cleanup.status.improvedMsg')
      }
    }
    if (scan) {
      const hasWork =
        scan.totalBytes > 0 || availableCategories.some((c) => c.id === 'recycle')
      return {
        status: 'good' as const,
        title: hasWork ? t('cleanup.status.readyTitle') : t('cleanup.status.noActionTitle'),
        message: hasWork
          ? t('cleanup.status.readyMsg', {
              bytes: formatBytes(scan.totalBytes),
              count: availableCategories.length
            })
          : t('cleanup.status.noActionMsg')
      }
    }
    return {
      status: 'good' as const,
      title: t('cleanup.status.idleTitle'),
      message: t('cleanup.status.idleMsg')
    }
  }, [
    t,
    isScanning,
    isCleaning,
    scanMutation.isError,
    scanMutation.error,
    lastResult,
    scan,
    availableCategories,
    progress?.message
  ])

  const selectionSummary =
    summary.count === 1
      ? summary.files > 0
        ? t('cleanup.selectedCategoryWithItems', {
            items: summary.files.toLocaleString()
          })
        : t('cleanup.selectedCategory')
      : summary.files > 0
        ? t('cleanup.selectedWithItems', {
            count: summary.count,
            items: summary.files.toLocaleString()
          })
        : t('cleanup.selectedCategories', { count: summary.count })

  return (
    <>
      <CleanupLoaderModal
        open={isCleaning}
        message={progress?.message}
        percent={progress?.percent}
        currentItem={progress?.currentItem}
        bytesFreedSoFar={progress?.bytesFreedSoFar}
        categoryId={progress?.categoryId}
        categories={(scan?.categories ?? [])
          .filter((c) => selected.has(c.id))
          .map((c) => ({ id: c.id, label: c.label }))}
        onCancel={() => void handleCancel()}
        cancelPending={cancelCleanup.isPending}
      />

      <div className="space-y-6 p-content-pad">
        <CleanupHero
          phase={phase}
          reclaimableBytes={scan?.totalBytes ?? 0}
          selectedCount={summary.count}
          selectedBytes={summary.bytes}
          fileCount={summary.files > 0 ? summary.files : scan?.totalFiles ?? 0}
          categoryCount={
            summary.count > 0 ? summary.count : availableCategories.length
          }
          scanned={Boolean(scan)}
          lastBytesFreed={lastResult && !lastResult.cancelled ? lastResult.bytesFreed : undefined}
          lastFilesRemoved={
            lastResult && !lastResult.cancelled ? lastResult.filesRemoved : undefined
          }
          busy={busy}
          isCleaning={isCleaning}
          cancelPending={cancelCleanup.isPending}
          optimizeDisabled={busy || summary.count === 0 || !scan}
          onScan={() => void handleScan()}
          onCancel={() => void handleCancel()}
          onOptimize={() => void handleClean()}
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

        {/* Inline scan progress only — clean uses CleanupLoaderModal */}
        {isScanning && progress ? (
          <CleanupProgressPanel
            mode="scan"
            message={progress.message}
            percent={progress.percent}
            currentItem={progress.currentItem}
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

        {lastResult && showCompletionFeedback ? (
          <CleanupResultsCard result={lastResult} />
        ) : null}

        <section aria-label={t('cleanup.categories')} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-section-title text-foreground">{t('cleanup.categories')}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('cleanup.categoriesHint')}
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
                  {t('cleanup.selectSafe')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg px-2.5 text-xs"
                  onClick={clearSelection}
                >
                  {t('common.clear')}
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
                <p className="text-sm font-semibold text-foreground">{t('cleanup.emptyTitle')}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('cleanup.emptyDesc')}
                </p>
              </div>
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                onClick={() => void handleScan()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t('cleanup.startScan')}
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
                  locked={category.id === 'temp' && !tempAccess.allowed}
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
                {t('cleanup.readyReclaim', { label: summary.label })}
              </p>
              <p className="text-xs text-muted-foreground">{selectionSummary}</p>
            </div>
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              onClick={() => void handleClean()}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t('cleanup.optimizeNow')}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  )
}

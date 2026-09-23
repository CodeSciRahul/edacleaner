import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  FileStack,
  FolderOpen,
  Loader2,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AppsEmptyState } from '@/features/apps/components/AppsEmptyState'
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { LargeFilesHero } from '@/features/storage/components/LargeFilesHero'
import { StorageSubnav } from '@/features/storage/components/StorageSubnav'
import {
  StorageFilterBar,
  storageFilterSelectClassName,
  storageFilterSelectWrapClassName
} from '@/features/storage/components/StorageFilterBar'
import { FileTypeIcon } from '@/features/storage/components/FileTypeIcon'
import {
  SafetyRiskBadge,
  isDeletableSafety
} from '@/features/storage/components/SafetyRiskBadge'
import {
  useDeleteFiles,
  useDeleteFilesProgress,
  useLargeFiles,
  useRevealInFolder,
  confirmMoveToTrash
} from '@/features/storage/hooks/useStorageData'
import { useInfiniteScrollReveal } from '@/features/storage/hooks/useInfiniteScrollReveal'
import {
  STORAGE_LIST_PAGE_SIZE,
  STORAGE_PAGE_LARGE_FILES_LIMIT
} from '@/features/storage/lib/list-limits'
import { getExtension, getFileCategory, type FileCategory } from '@/features/storage/lib/file-type'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { LargeFile } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import { appendStorageDeleteActivity } from '@/features/reports/lib/activity-history'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { StoragePremiumUpsell } from '@/features/storage/components/StoragePremiumUpsell'

type SortKey = 'size' | 'name' | 'path'
type SizeFilter = 'all' | '100mb' | '500mb' | '1gb' | '5gb'

const SIZE_FILTER_BYTES: Array<{ id: SizeFilter; minBytes: number; fallbackLabel: string }> = [
  { id: 'all', minBytes: 0, fallbackLabel: 'Any size' },
  { id: '100mb', minBytes: 100 * 1024 * 1024, fallbackLabel: '≥ 100 MB' },
  { id: '500mb', minBytes: 500 * 1024 * 1024, fallbackLabel: '≥ 500 MB' },
  { id: '1gb', minBytes: 1024 * 1024 * 1024, fallbackLabel: '≥ 1 GB' },
  { id: '5gb', minBytes: 5 * 1024 * 1024 * 1024, fallbackLabel: '≥ 5 GB' }
]

function safetyLabel(
  risk: LargeFile['safety']['riskLevel'],
  labels: { protected: string; highRisk: string; caution: string }
): string {
  if (risk === 'PROTECTED') return labels.protected
  if (risk === 'HIGH_RISK') return labels.highRisk
  if (risk === 'CAUTION') return labels.caution
  return ''
}

export function LargeFilesPage(): React.ReactElement {
  const { t } = useTranslation()
  const access = useFeatureAccess('large_files')
  const { data: files = [], isLoading, isError, error, refetch, isFetching } = useLargeFiles(
    { limit: STORAGE_PAGE_LARGE_FILES_LIMIT },
    access.allowed
  )
  const reveal = useRevealInFolder()
  const deleteFiles = useDeleteFiles()
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[]>([])
  const [omittedPaths, setOmittedPaths] = useState<string[]>([])
  const [heldFiles, setHeldFiles] = useState<LargeFile[]>([])
  const rowsBusy = pendingDeletePaths.length > 0
  const deleteProgress = useDeleteFilesProgress(rowsBusy)
  const mutatePending = deleteFiles.isPending

  const SIZE_FILTERS = SIZE_FILTER_BYTES.map((f) => ({
    ...f,
    label: f.id === 'all' ? t('largeFiles.anySize') : f.fallbackLabel
  }))

  const SORT_OPTIONS = [
    { value: 'size', label: t('largeFiles.sortSize') },
    { value: 'name', label: t('largeFiles.sortName') },
    { value: 'path', label: t('largeFiles.sortPath') }
  ]

  const [query, setQuery] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [category, setCategory] = useState<FileCategory | 'all'>('all')
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('size')
  const [selected, setSelected] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const deletingPath =
    deleteProgress?.currentItem ??
    (rowsBusy ? pendingDeletePaths[0] : undefined)

  const minBytes = SIZE_FILTER_BYTES.find((f) => f.id === sizeFilter)?.minBytes ?? 0
  const omittedSet = useMemo(() => new Set(omittedPaths), [omittedPaths])
  const pendingSet = useMemo(() => new Set(pendingDeletePaths), [pendingDeletePaths])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pathQ = pathFilter.trim().toLowerCase()

    let list = files.filter((file) => {
      if (omittedSet.has(file.path) && !pendingSet.has(file.path)) return false
      if (file.sizeBytes < minBytes) return false
      if (category !== 'all' && getFileCategory(file.name) !== category) return false
      if (q && !file.name.toLowerCase().includes(q)) return false
      if (pathQ && !file.path.toLowerCase().includes(pathQ)) return false
      return true
    })

    for (const held of heldFiles) {
      if (!pendingSet.has(held.path)) continue
      if (list.some((f) => f.path === held.path)) continue
      list.push(held)
    }

    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'path') return a.path.localeCompare(b.path)
      return b.sizeBytes - a.sizeBytes || a.name.localeCompare(b.name)
    })

    return list
  }, [
    files,
    query,
    pathFilter,
    category,
    minBytes,
    sortKey,
    omittedSet,
    pendingSet,
    heldFiles
  ])

  const deletableFiltered = useMemo(
    () => filtered.filter((f) => isDeletableSafety(f.safety)),
    [filtered]
  )

  const listResetKey = [
    query,
    pathFilter,
    category,
    sizeFilter,
    sortKey,
    omittedPaths.length,
    files.length
  ].join('|')

  const {
    visibleItems: visibleFiles,
    sentinelRef,
    hasMore,
    visibleCount,
    total: filteredTotal
  } = useInfiniteScrollReveal(filtered, {
    pageSize: STORAGE_LIST_PAGE_SIZE,
    resetKey: listResetKey
  })

  const totalBytes = filtered.reduce((sum, f) => sum + f.sizeBytes, 0)
  const maxBytes = Math.max(0, ...filtered.map((f) => f.sizeBytes))

  const togglePath = (path: string): void => {
    const file = files.find((f) => f.path === path) ?? filtered.find((f) => f.path === path)
    if (file && !isDeletableSafety(file.safety)) return
    setSelected((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const toggleAllVisible = (): void => {
    // Select all matching filtered (including not-yet-revealed) deletable rows
    const paths = deletableFiltered.map((f) => f.path)
    const allSelected = paths.length > 0 && paths.every((p) => selected.includes(p))
    if (allSelected) {
      setSelected((prev) => prev.filter((p) => !paths.includes(p)))
    } else {
      const skipped = filtered.length - paths.length
      setSelected((prev) => [...new Set([...prev, ...paths])])
      if (skipped > 0) {
        setNotice(t('storage.safety.selectSkipped'))
      }
    }
  }

  const copyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path)
      setCopiedPath(path)
      window.setTimeout(() => {
        setCopiedPath((current) => (current === path ? null : current))
      }, 1800)
    } catch {
      setNotice(t('storage.copy.failed'))
    }
  }

  const exportCsv = (): void => {
    const header = 'Name,Extension,SizeBytes,Risk,Path\n'
    const rows = filtered
      .map((f) => {
        const ext = getExtension(f.name)
        const safe = (v: string) => `"${v.replace(/"/g, '""')}"`
        return [
          safe(f.name),
          safe(ext),
          String(f.sizeBytes),
          safe(f.safety?.riskLevel ?? 'SAFE'),
          safe(f.path)
        ].join(',')
      })
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eda-large-files-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setNotice(`Exported ${filtered.length} file(s).`)
  }

  const finishDeleteUi = async (deleted: string[]): Promise<void> => {
    setPendingDeletePaths(deleted)
    await refetch()
    setOmittedPaths((prev) => [...new Set([...prev, ...deleted])])
    setPendingDeletePaths([])
    setHeldFiles([])
  }

  const handleDeleteSelected = async (): Promise<void> => {
    if (!access.guard()) return
    if (selected.length === 0) return
    setNotice(null)
    const confirmed = await confirmMoveToTrash(selected.length)
    if (!confirmed) return

    const targets = selected.slice()
    setPendingDeletePaths(targets)
    setHeldFiles(files.filter((f) => targets.includes(f.path)))

    const estimatedBytes = targets.reduce((sum, path) => {
      const file = files.find((f) => f.path === path)
      return sum + (file?.sizeBytes ?? 0)
    }, 0)
    const startedAt = Date.now()

    try {
      const result = await deleteFiles.mutateAsync(targets)
      if (result.canceled) {
        setPendingDeletePaths([])
        setHeldFiles([])
        return
      }
      const blockedCount = result.blocked?.length ?? 0
      if (result.deleted.length > 0) {
        const freedBytes = result.deleted.reduce((sum, path) => {
          const file = files.find((f) => f.path === path)
          return sum + (file?.sizeBytes ?? 0)
        }, 0)
        appendStorageDeleteActivity({
          source: 'large-files',
          deletedCount: result.deleted.length,
          failedCount: result.failed.length,
          estimatedBytes: freedBytes || estimatedBytes,
          durationMs: Date.now() - startedAt
        })
        setSelected((prev) => prev.filter((p) => !result.deleted.includes(p)))
        const blockedMsg =
          blockedCount > 0
            ? ` ${t('storage.safety.blockedNotice', { count: blockedCount })}`
            : ''
        setNotice(`Moved ${result.deleted.length} file(s) to trash.${blockedMsg}`)
        await finishDeleteUi(result.deleted)
      } else {
        setNotice(
          blockedCount > 0
            ? t('storage.safety.blockedNotice', { count: blockedCount })
            : (result.failed[0]?.error ?? 'No files were deleted.')
        )
        setPendingDeletePaths([])
        setHeldFiles([])
      }
    } catch {
      setPendingDeletePaths([])
      setHeldFiles([])
      setNotice('Delete failed. Try again.')
    }
  }

  const handleDeleteOne = async (file: LargeFile): Promise<void> => {
    if (!access.guard()) return
    if (!isDeletableSafety(file.safety)) {
      setNotice(file.safety.reason)
      return
    }
    setNotice(null)
    const confirmed = await confirmMoveToTrash(1)
    if (!confirmed) return

    setPendingDeletePaths([file.path])
    setHeldFiles([file])
    const startedAt = Date.now()

    try {
      const result = await deleteFiles.mutateAsync([file.path])
      if (result.canceled) {
        setPendingDeletePaths([])
        setHeldFiles([])
        return
      }
      if (result.deleted.length > 0) {
        appendStorageDeleteActivity({
          source: 'large-files',
          deletedCount: result.deleted.length,
          failedCount: result.failed.length,
          estimatedBytes: file.sizeBytes,
          durationMs: Date.now() - startedAt
        })
        setSelected((prev) => prev.filter((p) => !result.deleted.includes(p)))
        setNotice(`Moved ${result.deleted.length} file(s) to trash.`)
        await finishDeleteUi(result.deleted)
      } else {
        setNotice(
          result.blocked?.[0]?.reason ??
            result.failed[0]?.error ??
            'No files were deleted.'
        )
        setPendingDeletePaths([])
        setHeldFiles([])
      }
    } catch {
      setPendingDeletePaths([])
      setHeldFiles([])
      setNotice('Delete failed. Try again.')
    }
  }

  return (
    <>
      <div className="space-y-4 p-content-pad">
        <LargeFilesHero
          isLoading={isLoading}
          isFetching={isFetching}
          accessAllowed={access.allowed}
          fileCount={filtered.length}
          totalBytes={totalBytes}
          selectedCount={selected.length}
          exportDisabled={!access.allowed || filtered.length === 0}
          deleteDisabled={selected.length === 0 || rowsBusy}
          onRefresh={() => {
            setNotice(null)
            setOmittedPaths([])
            void refetch()
          }}
          onExport={exportCsv}
          onDelete={() => void handleDeleteSelected()}
        />
        <PageBreadcrumb
          items={[
            { label: t('storage.title'), href: '/storage' },
            { label: t('largeFiles.title') }
          ]}
        />
        <StorageSubnav />

        {!access.allowed ? (
          <StoragePremiumUpsell feature="large_files" variant="largeFiles" />
        ) : (
          <>
            <StorageFilterBar
              query={query}
              onQueryChange={setQuery}
              pathFilter={pathFilter}
              onPathFilterChange={setPathFilter}
              category={category}
              onCategoryChange={setCategory}
              sortKey={sortKey}
              sortOptions={SORT_OPTIONS}
              onSortKeyChange={(v) => setSortKey(v as SortKey)}
            >
              <label className={storageFilterSelectWrapClassName}>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {t('largeFiles.sortSize')}
                </span>
                <select
                  className={storageFilterSelectClassName}
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value as SizeFilter)}
                  aria-label="Minimum file size"
                >
                  {SIZE_FILTERS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            </StorageFilterBar>

            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card animate-in fade-in-0 duration-300">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-warning/14 via-warning/5 to-transparent"
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/80 px-4 py-3 text-xs text-muted-foreground sm:px-5">
                <span className="font-medium text-foreground/80">
                  {t('storage.list.showing', {
                    visible: visibleCount,
                    total: filteredTotal
                  })}
                </span>
                {files.length !== filtered.length ? (
                  <>
                    <span className="text-border">·</span>
                    <span>{t('storage.list.scanned', { count: files.length })}</span>
                  </>
                ) : null}
                <span className="text-border">·</span>
                <span>
                  {t('storage.list.totalBytes', { bytes: formatBytes(totalBytes) })}
                </span>
                {selected.length > 0 ? (
                  <>
                    <span className="text-border">·</span>
                    <span className="rounded-full bg-warning/12 px-2 py-0.5 font-semibold tabular-nums text-warning ring-1 ring-warning/20">
                      {t('storage.list.selected', { count: selected.length })}
                    </span>
                  </>
                ) : null}
              </div>

              {notice ? (
                <div
                  className="relative z-10 border-b border-border/80 bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground sm:px-5"
                  role="status"
                >
                  {notice}
                </div>
              ) : null}

              {isLoading ? (
                <div className="relative z-10 divide-y divide-border/70">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex animate-pulse items-center gap-3.5 px-4 py-3.5 sm:px-5"
                    >
                      <div className="h-4 w-4 rounded bg-muted" />
                      <div className="h-9 w-9 rounded-xl bg-muted" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-40 rounded-lg bg-muted" />
                        <div className="h-3 w-56 rounded-lg bg-muted" />
                      </div>
                      <div className="h-5 w-14 rounded-full bg-muted" />
                      <div className="h-4 w-16 rounded-lg bg-muted" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="relative z-10">
                  <AppsEmptyState
                    icon={AlertCircle}
                    title={t('largeFiles.loadError')}
                    description={
                      error instanceof Error ? error.message : t('largeFiles.loadError')
                    }
                    actionLabel={t('common.retry')}
                    onAction={() => void refetch()}
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div className="relative z-10">
                  <AppsEmptyState
                    icon={FileStack}
                    title={
                      files.length === 0
                        ? t('largeFiles.emptyNone')
                        : t('largeFiles.emptyFilter')
                    }
                    description={
                      files.length === 0
                        ? t('largeFiles.emptyNoneHint')
                        : t('largeFiles.emptyFilterHint')
                    }
                  />
                </div>
              ) : (
                <div className="relative z-10 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead className="sticky top-0 z-10 bg-card/90 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                      <tr className="border-b border-border/80">
                        <th className="w-10 px-4 py-3 sm:px-5">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            aria-label="Select all visible"
                            checked={
                              deletableFiltered.length > 0 &&
                              deletableFiltered.every((f) => selected.includes(f.path))
                            }
                            onChange={toggleAllVisible}
                            disabled={rowsBusy || deletableFiltered.length === 0}
                          />
                        </th>
                        <th className="px-2 py-3 font-medium">{t('largeFiles.col.name')}</th>
                        <th className="hidden px-2 py-3 font-medium sm:table-cell">
                          {t('largeFiles.col.type')}
                        </th>
                        <th className="px-2 py-3 font-medium">{t('largeFiles.col.size')}</th>
                        <th className="hidden px-2 py-3 font-medium md:table-cell">
                          {t('largeFiles.col.path')}
                        </th>
                        <th className="px-4 py-3 text-right font-medium sm:px-5">
                          {t('largeFiles.col.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {visibleFiles.map((file) => {
                        const inBatch = pendingSet.has(file.path)
                        const deleting =
                          inBatch && (!mutatePending || deletingPath === file.path)
                        const queued =
                          inBatch && mutatePending && deletingPath !== file.path
                        return (
                          <LargeFileRow
                            key={file.path}
                            file={file}
                            maxBytes={maxBytes}
                            selected={selected.includes(file.path)}
                            copied={copiedPath === file.path}
                            deleting={deleting}
                            queued={queued}
                            actionsDisabled={rowsBusy}
                            riskLabel={safetyLabel(file.safety?.riskLevel ?? 'SAFE', {
                              protected: t('storage.safety.protected'),
                              highRisk: t('storage.safety.highRisk'),
                              caution: t('storage.safety.caution')
                            })}
                            onToggle={() => togglePath(file.path)}
                            onReveal={() => reveal.mutate(file.path)}
                            onCopy={() => void copyPath(file.path)}
                            onDelete={() => void handleDeleteOne(file)}
                          />
                        )
                      })}
                    </tbody>
                  </table>
                  <div
                    ref={sentinelRef}
                    className="flex items-center justify-center border-t border-border/80 px-4 py-3 text-xs text-muted-foreground"
                    aria-hidden={!hasMore}
                  >
                    {hasMore
                      ? t('storage.list.loadingMore')
                      : filteredTotal > STORAGE_LIST_PAGE_SIZE
                        ? t('storage.list.end')
                        : null}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function LargeFileRow({
  file,
  maxBytes,
  selected,
  copied,
  deleting,
  queued,
  actionsDisabled,
  riskLabel,
  onToggle,
  onReveal,
  onCopy,
  onDelete
}: {
  file: LargeFile
  maxBytes: number
  selected: boolean
  copied: boolean
  deleting: boolean
  queued: boolean
  actionsDisabled: boolean
  riskLabel: string
  onToggle: () => void
  onReveal: () => void
  onCopy: () => void
  onDelete: () => void
}): React.ReactElement {
  const { t } = useTranslation()
  const ext = getExtension(file.name)
  const canDelete = isDeletableSafety(file.safety)
  const share =
    maxBytes > 0 && file.sizeBytes > 0
      ? Math.max(8, Math.round((file.sizeBytes / maxBytes) * 100))
      : 0

  return (
    <tr
      className={cn(
        'group align-middle transition-colors hover:bg-warning/[0.04]',
        selected && 'bg-warning/[0.06]',
        deleting && 'bg-destructive/5 ring-1 ring-inset ring-destructive/20',
        queued && 'opacity-60',
        !canDelete && 'bg-muted/10'
      )}
    >
      <td className="px-4 py-3.5 sm:px-5">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={selected}
          disabled={actionsDisabled || !canDelete}
          onChange={onToggle}
          aria-label={`Select ${file.name}`}
        />
      </td>
      <td className="px-2 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <FileTypeIcon fileName={file.name} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
              {file.safety ? (
                <SafetyRiskBadge safety={file.safety} label={riskLabel} />
              ) : null}
            </div>
            <p
              className="mt-0.5 truncate text-[11px] text-muted-foreground md:hidden"
              title={file.path}
            >
              {file.path}
            </p>
            {file.safety && file.safety.riskLevel !== 'SAFE' ? (
              <p
                className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground"
                title={file.safety.reason}
              >
                {file.safety.reason}
              </p>
            ) : null}
            {deleting ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-destructive">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                {t('storage.deleting.row')}
              </p>
            ) : queued ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t('storage.deleting.queued')}
              </p>
            ) : null}
          </div>
        </div>
      </td>
      <td className="hidden px-2 py-3.5 sm:table-cell">
        <span className="inline-flex max-w-[5.5rem] truncate rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border/60">
          {ext || '—'}
        </span>
      </td>
      <td className="px-2 py-3.5">
        <div className="min-w-[5.5rem]">
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatBytes(file.sizeBytes)}
          </p>
          {share > 0 ? (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-warning to-chart-disk transition-[width] duration-500"
                style={{ width: `${share}%` }}
              />
            </div>
          ) : null}
        </div>
      </td>
      <td className="hidden max-w-[280px] px-2 py-3.5 md:table-cell">
        <p className="truncate text-xs text-muted-foreground" title={file.path}>
          {file.path}
        </p>
      </td>
      <td className="px-4 py-3.5 sm:px-5">
        <div className="flex justify-end gap-1 opacity-80 transition-opacity group-hover:opacity-100">
          {deleting ? (
            <div
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-destructive"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('storage.deleting.rowShort')}
            </div>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 rounded-lg p-0"
                aria-label={`Reveal ${file.name}`}
                disabled={actionsDisabled}
                onClick={onReveal}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 w-8 rounded-lg p-0 transition-colors',
                  copied && 'bg-success/15 text-success hover:bg-success/20 hover:text-success'
                )}
                aria-label={
                  copied ? t('storage.copy.copied') : `Copy path for ${file.name}`
                }
                disabled={actionsDisabled}
                onClick={onCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" />
                ) : (
                  <ClipboardCopy className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label={
                  canDelete
                    ? `Delete ${file.name}`
                    : `Protected — ${file.safety?.reason ?? 'cannot delete'}`
                }
                disabled={actionsDisabled || !canDelete}
                title={!canDelete ? file.safety?.reason : undefined}
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

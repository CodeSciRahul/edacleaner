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
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { LargeFilesHero } from '@/features/storage/components/LargeFilesHero'
import { StorageSubnav } from '@/features/storage/components/StorageSubnav'
import { StorageFilterBar } from '@/features/storage/components/StorageFilterBar'
import { FileTypeIcon } from '@/features/storage/components/FileTypeIcon'
import {
  useDeleteFiles,
  useDeleteFilesProgress,
  useLargeFiles,
  useRevealInFolder,
  confirmMoveToTrash
} from '@/features/storage/hooks/useStorageData'
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

export function LargeFilesPage(): React.ReactElement {
  const { t } = useTranslation()
  const access = useFeatureAccess('large_files')
  const { data: files = [], isLoading, isError, error, refetch, isFetching } = useLargeFiles(
    undefined,
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

    // Keep deleting rows visible during list refresh (may vanish from query early)
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

  const totalBytes = filtered.reduce((sum, f) => sum + f.sizeBytes, 0)

  const togglePath = (path: string): void => {
    setSelected((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const toggleAllVisible = (): void => {
    const paths = filtered.map((f) => f.path)
    const allSelected = paths.length > 0 && paths.every((p) => selected.includes(p))
    if (allSelected) {
      setSelected((prev) => prev.filter((p) => !paths.includes(p)))
    } else {
      setSelected((prev) => [...new Set([...prev, ...paths])])
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
    const header = 'Name,Extension,SizeBytes,Path\n'
    const rows = filtered
      .map((f) => {
        const ext = getExtension(f.name)
        const safe = (v: string) => `"${v.replace(/"/g, '""')}"`
        return [safe(f.name), safe(ext), String(f.sizeBytes), safe(f.path)].join(',')
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
    // Keep row loaders through list refresh, then drop rows with the loader
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
        setNotice(`Moved ${result.deleted.length} file(s) to trash.`)
        await finishDeleteUi(result.deleted)
      } else {
        setNotice(result.failed[0]?.error ?? 'No files were deleted.')
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
        setNotice(result.failed[0]?.error ?? 'No files were deleted.')
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
            {notice ? (
              <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {notice}
              </p>
            ) : null}

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
              <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground">
                <span className="shrink-0">{t('largeFiles.sortSize')}</span>
                <select
                  className="bg-transparent text-sm text-foreground outline-none"
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

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>
                <strong className="text-foreground">{filtered.length}</strong> shown
                {files.length !== filtered.length ? ` of ${files.length}` : ''}
              </span>
              <span>·</span>
              <span>
                Total <strong className="text-foreground">{formatBytes(totalBytes)}</strong>
              </span>
              {selected.length > 0 ? (
                <>
                  <span>·</span>
                  <span>
                    <strong className="text-foreground">{selected.length}</strong> selected
                  </span>
                </>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              {isLoading ? (
                <EmptyBlock message={t('largeFiles.emptyScanning')} />
              ) : isError ? (
                <ErrorBlock
                  message={error instanceof Error ? error.message : 'Failed to load large files'}
                  onRetry={() => void refetch()}
                  retryLabel={t('common.retry')}
                />
              ) : filtered.length === 0 ? (
                <EmptyBlock
                  icon
                  message={
                    files.length === 0
                      ? t('largeFiles.emptyNone')
                      : t('largeFiles.emptyFilter')
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <tr className="border-b border-border">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            aria-label="Select all visible"
                            checked={
                              filtered.length > 0 &&
                              filtered.every((f) => selected.includes(f.path))
                            }
                            onChange={toggleAllVisible}
                            disabled={rowsBusy}
                          />
                        </th>
                        <th className="px-2 py-3 font-medium">{t('largeFiles.col.name')}</th>
                        <th className="px-2 py-3 font-medium">{t('largeFiles.col.type')}</th>
                        <th className="px-2 py-3 font-medium">{t('largeFiles.col.size')}</th>
                        <th className="px-2 py-3 font-medium">{t('largeFiles.col.path')}</th>
                        <th className="px-4 py-3 text-right font-medium">{t('largeFiles.col.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filtered.map((file) => {
                        const inBatch = pendingSet.has(file.path)
                        const deleting =
                          inBatch && (!mutatePending || deletingPath === file.path)
                        const queued =
                          inBatch && mutatePending && deletingPath !== file.path
                        return (
                          <LargeFileRow
                            key={file.path}
                            file={file}
                            selected={selected.includes(file.path)}
                            copied={copiedPath === file.path}
                            deleting={deleting}
                            queued={queued}
                            actionsDisabled={rowsBusy}
                            onToggle={() => togglePath(file.path)}
                            onReveal={() => reveal.mutate(file.path)}
                            onCopy={() => void copyPath(file.path)}
                            onDelete={() => void handleDeleteOne(file)}
                          />
                        )
                      })}
                    </tbody>
                  </table>
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
  selected,
  copied,
  deleting,
  queued,
  actionsDisabled,
  onToggle,
  onReveal,
  onCopy,
  onDelete
}: {
  file: LargeFile
  selected: boolean
  copied: boolean
  deleting: boolean
  queued: boolean
  actionsDisabled: boolean
  onToggle: () => void
  onReveal: () => void
  onCopy: () => void
  onDelete: () => void
}): React.ReactElement {
  const { t } = useTranslation()
  const ext = getExtension(file.name)

  return (
    <tr
      className={cn(
        'transition-colors hover:bg-muted/40',
        selected && 'bg-primary/5',
        deleting && 'bg-destructive/5 ring-1 ring-inset ring-destructive/20',
        queued && 'opacity-60'
      )}
    >
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={selected}
          disabled={actionsDisabled}
          onChange={onToggle}
          aria-label={`Select ${file.name}`}
        />
      </td>
      <td className="px-2 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileTypeIcon fileName={file.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{file.name}</p>
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
      <td className="px-2 py-3 uppercase text-muted-foreground">{ext || '—'}</td>
      <td className="px-2 py-3 tabular-nums font-medium text-foreground">
        {formatBytes(file.sizeBytes)}
      </td>
      <td className="max-w-[280px] px-2 py-3">
        <p className="truncate text-xs text-muted-foreground" title={file.path}>
          {file.path}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          {deleting ? (
            <div
              className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-destructive"
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
                className="h-8 w-8 p-0"
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
                  'h-8 w-8 p-0 transition-colors',
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
                className="h-8 w-8 p-0 text-destructive"
                aria-label={`Delete ${file.name}`}
                disabled={actionsDisabled}
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

function EmptyBlock({
  message,
  icon
}: {
  message: string
  icon?: boolean
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon ? <FileStack className="mb-3 h-8 w-8 text-muted-foreground" /> : null}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function ErrorBlock({
  message,
  onRetry,
  retryLabel
}: {
  message: string
  onRetry: () => void
  retryLabel: string
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-destructive">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        {retryLabel}
      </Button>
    </div>
  )
}

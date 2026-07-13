import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ClipboardCopy,
  Download,
  FileStack,
  FolderOpen,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { StorageSubnav } from '@/features/storage/components/StorageSubnav'
import { StorageFilterBar } from '@/features/storage/components/StorageFilterBar'
import { FileTypeIcon } from '@/features/storage/components/FileTypeIcon'
import {
  useDeleteFiles,
  useLargeFiles,
  useRevealInFolder
} from '@/features/storage/hooks/useStorageData'
import { getExtension, getFileCategory, type FileCategory } from '@/features/storage/lib/file-type'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { LargeFile } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import { appendStorageDeleteActivity } from '@/features/reports/lib/activity-history'

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
  const { data: files = [], isLoading, isError, error, refetch, isFetching } = useLargeFiles()
  const reveal = useRevealInFolder()
  const deleteFiles = useDeleteFiles()

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

  const minBytes = SIZE_FILTER_BYTES.find((f) => f.id === sizeFilter)?.minBytes ?? 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pathQ = pathFilter.trim().toLowerCase()

    let list = files.filter((file) => {
      if (file.sizeBytes < minBytes) return false
      if (category !== 'all' && getFileCategory(file.name) !== category) return false
      if (q && !file.name.toLowerCase().includes(q)) return false
      if (pathQ && !file.path.toLowerCase().includes(pathQ)) return false
      return true
    })

    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'path') return a.path.localeCompare(b.path)
      return b.sizeBytes - a.sizeBytes || a.name.localeCompare(b.name)
    })

    return list
  }, [files, query, pathFilter, category, minBytes, sortKey])

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
      setNotice('Path copied to clipboard.')
    } catch {
      setNotice('Could not copy path.')
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

  const handleDeleteSelected = async (): Promise<void> => {
    if (selected.length === 0) return
    setNotice(null)
    const estimatedBytes = selected.reduce((sum, path) => {
      const file = files.find((f) => f.path === path)
      return sum + (file?.sizeBytes ?? 0)
    }, 0)
    const startedAt = Date.now()
    const result = await deleteFiles.mutateAsync(selected)
    if (result.canceled) return
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
    } else {
      setNotice(result.failed[0]?.error ?? 'No files were deleted.')
    }
  }

  const handleDeleteOne = async (file: LargeFile): Promise<void> => {
    setNotice(null)
    const startedAt = Date.now()
    const result = await deleteFiles.mutateAsync([file.path])
    if (result.canceled) return
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
    } else {
      setNotice(result.failed[0]?.error ?? 'No files were deleted.')
    }
  }

  return (
    <>
      <Toolbar
        title={t('largeFiles.title')}
        description={t('largeFiles.description')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              disabled={isFetching}
              onClick={() => {
                setNotice(null)
                void refetch()
              }}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              disabled={filtered.length === 0}
              onClick={exportCsv}
            >
              <Download className="h-4 w-4" />
              {t('largeFiles.export')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-9 gap-2"
              disabled={selected.length === 0 || deleteFiles.isPending}
              onClick={() => void handleDeleteSelected()}
            >
              <Trash2 className="h-4 w-4" />
              {t('largeFiles.delete', { count: selected.length })}
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-content-pad">
        <PageBreadcrumb
          items={[
            { label: t('storage.title'), href: '/storage' },
            { label: t('largeFiles.title') }
          ]}
        />
        <StorageSubnav />

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
                  {filtered.map((file) => (
                    <LargeFileRow
                      key={file.path}
                      file={file}
                      selected={selected.includes(file.path)}
                      busy={deleteFiles.isPending}
                      onToggle={() => togglePath(file.path)}
                      onReveal={() => reveal.mutate(file.path)}
                      onCopy={() => void copyPath(file.path)}
                      onDelete={() => void handleDeleteOne(file)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function LargeFileRow({
  file,
  selected,
  busy,
  onToggle,
  onReveal,
  onCopy,
  onDelete
}: {
  file: LargeFile
  selected: boolean
  busy: boolean
  onToggle: () => void
  onReveal: () => void
  onCopy: () => void
  onDelete: () => void
}): React.ReactElement {
  const ext = getExtension(file.name)

  return (
    <tr className={cn('transition-colors hover:bg-muted/40', selected && 'bg-primary/5')}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="rounded border-border"
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${file.name}`}
        />
      </td>
      <td className="px-2 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileTypeIcon fileName={file.name} />
          <p className="truncate font-medium text-foreground">{file.name}</p>
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
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={`Reveal ${file.name}`}
            onClick={onReveal}
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label={`Copy path for ${file.name}`}
            onClick={onCopy}
          >
            <ClipboardCopy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            aria-label={`Delete ${file.name}`}
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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

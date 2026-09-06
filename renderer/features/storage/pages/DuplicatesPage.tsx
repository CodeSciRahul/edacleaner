import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ClipboardCopy,
  Copy,
  FolderOpen
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { DuplicatesHero } from '@/features/storage/components/DuplicatesHero'
import { StorageSubnav } from '@/features/storage/components/StorageSubnav'
import { StorageFilterBar } from '@/features/storage/components/StorageFilterBar'
import { FileTypeIcon } from '@/features/storage/components/FileTypeIcon'
import {
  useDeleteFiles,
  useDuplicates,
  useRevealInFolder
} from '@/features/storage/hooks/useStorageData'
import { getFileCategory, type FileCategory } from '@/features/storage/lib/file-type'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { DuplicateGroup } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import { appendStorageDeleteActivity } from '@/features/reports/lib/activity-history'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { FeatureLockedCallout } from '@/features/entitlements/components/FeatureLockedCallout'

type SortKey = 'size' | 'copies' | 'name'
type SizeFilter = 'all' | '10mb' | '50mb' | '100mb' | '500mb'

const SIZE_FILTER_BYTES: Array<{ id: SizeFilter; minBytes: number; fallbackLabel: string }> = [
  { id: 'all', minBytes: 0, fallbackLabel: 'Any size' },
  { id: '10mb', minBytes: 10 * 1024 * 1024, fallbackLabel: '≥ 10 MB' },
  { id: '50mb', minBytes: 50 * 1024 * 1024, fallbackLabel: '≥ 50 MB' },
  { id: '100mb', minBytes: 100 * 1024 * 1024, fallbackLabel: '≥ 100 MB' },
  { id: '500mb', minBytes: 500 * 1024 * 1024, fallbackLabel: '≥ 500 MB' }
]

export function DuplicatesPage(): React.ReactElement {
  const { t } = useTranslation()
  const access = useFeatureAccess('duplicates')
  const { data: groups = [], isLoading, isError, error, refetch, isFetching } = useDuplicates(
    undefined,
    access.allowed
  )
  const reveal = useRevealInFolder()
  const deleteFiles = useDeleteFiles()

  const SIZE_FILTERS = SIZE_FILTER_BYTES.map((f) => ({
    ...f,
    label: f.id === 'all' ? t('largeFiles.anySize') : f.fallbackLabel
  }))

  const SORT_OPTIONS = [
    { value: 'size', label: t('duplicates.sortSize') },
    { value: 'copies', label: t('duplicates.sortCopies') },
    { value: 'name', label: t('duplicates.sortName') }
  ]

  const [query, setQuery] = useState('')
  const [pathFilter, setPathFilter] = useState('')
  const [category, setCategory] = useState<FileCategory | 'all'>('all')
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all')
  const [minCopies, setMinCopies] = useState(2)
  const [sortKey, setSortKey] = useState<SortKey>('size')
  const [selected, setSelected] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const minBytes = SIZE_FILTER_BYTES.find((f) => f.id === sizeFilter)?.minBytes ?? 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pathQ = pathFilter.trim().toLowerCase()

    let list = groups.filter((group) => {
      if (group.sizeBytes < minBytes) return false
      if (group.copies < minCopies) return false
      if (category !== 'all' && getFileCategory(group.name) !== category) return false
      if (q && !group.name.toLowerCase().includes(q)) return false
      if (pathQ && !group.paths.some((p) => p.toLowerCase().includes(pathQ))) return false
      return true
    })

    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'copies') return b.copies - a.copies || a.name.localeCompare(b.name)
      return b.sizeBytes - a.sizeBytes || a.name.localeCompare(b.name)
    })

    return list
  }, [groups, query, pathFilter, category, minBytes, minCopies, sortKey])

  const wasteBytes = filtered.reduce(
    (sum, g) => sum + g.sizeBytes * Math.max(0, g.copies - 1),
    0
  )

  const togglePath = (path: string): void => {
    setSelected((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const selectAllExceptKeep = (): void => {
    const extras = filtered.flatMap((g) => g.paths.slice(1))
    setSelected((prev) => [...new Set([...prev, ...extras])])
    setNotice(`Selected ${extras.length} duplicate copy(ies), keeping originals.`)
  }

  const clearSelection = (): void => {
    setSelected([])
    setNotice(null)
  }

  const copyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path)
      setNotice('Path copied to clipboard.')
    } catch {
      setNotice('Could not copy path.')
    }
  }

  const handleDeleteSelected = async (): Promise<void> => {
    if (!access.guard()) return
    if (selected.length === 0) return
    setNotice(null)
    const estimatedBytes = selected.reduce((sum, path) => {
      const group = groups.find((g) => g.paths.includes(path))
      return sum + (group?.sizeBytes ?? 0)
    }, 0)
    const startedAt = Date.now()
    const result = await deleteFiles.mutateAsync(selected)
    if (result.canceled) return
    if (result.deleted.length > 0) {
      const freedBytes = result.deleted.reduce((sum, path) => {
        const group = groups.find((g) => g.paths.includes(path))
        return sum + (group?.sizeBytes ?? 0)
      }, 0)
      appendStorageDeleteActivity({
        source: 'duplicates',
        deletedCount: result.deleted.length,
        failedCount: result.failed.length,
        estimatedBytes: freedBytes || estimatedBytes,
        durationMs: Date.now() - startedAt
      })
      setSelected((prev) => prev.filter((p) => !result.deleted.includes(p)))
      setNotice(`Moved ${result.deleted.length} duplicate(s) to trash.`)
    } else {
      setNotice(result.failed[0]?.error ?? 'No files were deleted.')
    }
  }

  return (
    <>
      <div className="space-y-4 p-content-pad">
        <FeatureLockedCallout feature="duplicates" compact />
        <DuplicatesHero
          isLoading={isLoading}
          isFetching={isFetching}
          accessAllowed={access.allowed}
          groupCount={filtered.length}
          wasteBytes={wasteBytes}
          selectedCount={selected.length}
          selectDisabled={!access.allowed || filtered.length === 0}
          clearDisabled={selected.length === 0}
          deleteDisabled={selected.length === 0 || deleteFiles.isPending}
          onRefresh={() => {
            setNotice(null)
            void refetch()
          }}
          onSelectDuplicates={selectAllExceptKeep}
          onClear={clearSelection}
          onDelete={() => void handleDeleteSelected()}
        />
        <PageBreadcrumb
          items={[
            { label: t('storage.title'), href: '/storage' },
            { label: t('storage.subnav.duplicates') }
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
            <span className="shrink-0">{t('duplicates.sortSize')}</span>
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
          <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground">
            <span className="shrink-0">{t('duplicates.sortCopies')}</span>
            <select
              className="bg-transparent text-sm text-foreground outline-none"
              value={String(minCopies)}
              onChange={(e) => setMinCopies(Number(e.target.value))}
              aria-label="Minimum duplicate copies"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  ≥ {n}
                </option>
              ))}
            </select>
          </label>
        </StorageFilterBar>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{filtered.length}</strong> groups
          </span>
          <span>·</span>
          <span>
            Waste <strong className="text-foreground">{formatBytes(wasteBytes)}</strong>
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

        {isLoading ? (
          <EmptyCard message={t('duplicates.emptyScanning')} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center shadow-card">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load duplicates'}
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyCard
            icon
            message={
              groups.length === 0
                ? t('duplicates.emptyNone')
                : t('duplicates.emptyFilter')
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((group) => (
              <DuplicateGroupCard
                key={`${group.name}-${group.paths[0]}`}
                group={group}
                selected={selected}
                busy={deleteFiles.isPending}
                onToggle={togglePath}
                onReveal={(path) => reveal.mutate(path)}
                onCopy={(path) => void copyPath(path)}
                keepLabel={t('duplicates.keep')}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function DuplicateGroupCard({
  group,
  selected,
  busy,
  onToggle,
  onReveal,
  onCopy,
  keepLabel
}: {
  group: DuplicateGroup
  selected: string[]
  busy: boolean
  onToggle: (path: string) => void
  onReveal: (path: string) => void
  onCopy: (path: string) => void
  keepLabel: string
}): React.ReactElement {
  const waste = group.sizeBytes * Math.max(0, group.copies - 1)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <FileTypeIcon fileName={group.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{group.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(group.sizeBytes)} each · {group.copies} copies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="tabular-nums">
            {formatBytes(waste)} waste
          </Badge>
        </div>
      </div>

      <ul className="divide-y divide-border">
        {group.paths.map((path, index) => {
          const isKeep = index === 0
          const isSelected = selected.includes(path)
          const name = path.split(/[/\\]/).pop() ?? path

          return (
            <li
              key={path}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40',
                isSelected && 'bg-primary/5'
              )}
            >
              <input
                type="checkbox"
                className="rounded border-border"
                checked={isSelected}
                disabled={busy}
                onChange={() => onToggle(path)}
                aria-label={`Select ${name}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{name}</p>
                  {isKeep ? (
                    <Badge className="border-0 bg-success/10 text-success text-[10px]">
                      {keepLabel}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Duplicate
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground" title={path}>
                  {path}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label={`Reveal ${name}`}
                  onClick={() => onReveal(path)}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label={`Copy path for ${name}`}
                  onClick={() => onCopy(path)}
                >
                  <ClipboardCopy className="h-4 w-4" />
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function EmptyCard({
  message,
  icon
}: {
  message: string
  icon?: boolean
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-16 text-center shadow-card">
      {icon ? <Copy className="mb-3 h-8 w-8 text-muted-foreground" /> : null}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

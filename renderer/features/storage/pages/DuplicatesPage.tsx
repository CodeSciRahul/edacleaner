import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  Copy,
  FolderOpen,
  Loader2
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
  useDeleteFilesProgress,
  useDuplicates,
  useRevealInFolder,
  confirmMoveToTrash
} from '@/features/storage/hooks/useStorageData'
import { getFileCategory, type FileCategory } from '@/features/storage/lib/file-type'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { DuplicateGroup } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import { appendStorageDeleteActivity } from '@/features/reports/lib/activity-history'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { StoragePremiumUpsell } from '@/features/storage/components/StoragePremiumUpsell'

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
  const [pendingDeletePaths, setPendingDeletePaths] = useState<string[]>([])
  const [omittedPaths, setOmittedPaths] = useState<string[]>([])
  const [heldGroups, setHeldGroups] = useState<DuplicateGroup[]>([])
  const rowsBusy = pendingDeletePaths.length > 0
  const deleteProgress = useDeleteFilesProgress(rowsBusy)
  const mutatePending = deleteFiles.isPending

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
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const deletingPath =
    deleteProgress?.currentItem ?? (rowsBusy ? pendingDeletePaths[0] : undefined)

  const minBytes = SIZE_FILTER_BYTES.find((f) => f.id === sizeFilter)?.minBytes ?? 0
  const omittedSet = useMemo(() => new Set(omittedPaths), [omittedPaths])
  const pendingSet = useMemo(() => new Set(pendingDeletePaths), [pendingDeletePaths])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const pathQ = pathFilter.trim().toLowerCase()
    const groupKey = (g: DuplicateGroup): string => `${g.name}::${g.paths[0] ?? g.name}`

    let list = groups
      .map((group) => {
        const paths = group.paths.filter(
          (p) => !omittedSet.has(p) || pendingSet.has(p)
        )
        return { ...group, paths, copies: paths.length }
      })
      .filter((group) => {
        if (group.paths.length === 0) return false
        if (group.sizeBytes < minBytes) return false
        if (group.copies < minCopies && !group.paths.some((p) => pendingSet.has(p))) {
          return false
        }
        if (category !== 'all' && getFileCategory(group.name) !== category) return false
        if (q && !group.name.toLowerCase().includes(q)) return false
        if (pathQ && !group.paths.some((p) => p.toLowerCase().includes(pathQ))) return false
        return true
      })

    const byKey = new Map(list.map((g) => [groupKey(g), g]))
    for (const held of heldGroups) {
      const keep = held.paths.filter((p) => pendingSet.has(p))
      if (keep.length === 0) continue
      const key = groupKey(held)
      const existing = byKey.get(key)
      if (!existing) {
        byKey.set(key, { ...held, paths: keep, copies: keep.length })
      } else {
        const merged = [...existing.paths]
        for (const p of keep) {
          if (!merged.includes(p)) merged.push(p)
        }
        byKey.set(key, { ...existing, paths: merged, copies: merged.length })
      }
    }

    list = [...byKey.values()].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'copies') return b.copies - a.copies || a.name.localeCompare(b.name)
      return b.sizeBytes - a.sizeBytes || a.name.localeCompare(b.name)
    })

    return list
  }, [
    groups,
    query,
    pathFilter,
    category,
    minBytes,
    minCopies,
    sortKey,
    omittedSet,
    pendingSet,
    heldGroups
  ])

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
      setCopiedPath(path)
      window.setTimeout(() => {
        setCopiedPath((current) => (current === path ? null : current))
      }, 1800)
    } catch {
      setNotice(t('storage.copy.failed'))
    }
  }

  const finishDeleteUi = async (deleted: string[]): Promise<void> => {
    setPendingDeletePaths(deleted)
    await refetch()
    setOmittedPaths((prev) => [...new Set([...prev, ...deleted])])
    setPendingDeletePaths([])
    setHeldGroups([])
  }

  const handleDeleteSelected = async (): Promise<void> => {
    if (!access.guard()) return
    if (selected.length === 0) return
    setNotice(null)
    const confirmed = await confirmMoveToTrash(selected.length)
    if (!confirmed) return

    const targets = selected.slice()
    setPendingDeletePaths(targets)
    setHeldGroups(groups.filter((g) => g.paths.some((p) => targets.includes(p))))

    const estimatedBytes = targets.reduce((sum, path) => {
      const group = groups.find((g) => g.paths.includes(path))
      return sum + (group?.sizeBytes ?? 0)
    }, 0)
    const startedAt = Date.now()

    try {
      const result = await deleteFiles.mutateAsync(targets)
      if (result.canceled) {
        setPendingDeletePaths([])
        setHeldGroups([])
        return
      }
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
        await finishDeleteUi(result.deleted)
      } else {
        setNotice(result.failed[0]?.error ?? 'No files were deleted.')
        setPendingDeletePaths([])
        setHeldGroups([])
      }
    } catch {
      setPendingDeletePaths([])
      setHeldGroups([])
      setNotice('Delete failed. Try again.')
    }
  }

  return (
    <>
      <div className="space-y-4 p-content-pad">
        <DuplicatesHero
          isLoading={isLoading}
          isFetching={isFetching}
          accessAllowed={access.allowed}
          groupCount={filtered.length}
          wasteBytes={wasteBytes}
          selectedCount={selected.length}
          selectDisabled={!access.allowed || filtered.length === 0 || rowsBusy}
          clearDisabled={selected.length === 0 || rowsBusy}
          deleteDisabled={selected.length === 0 || rowsBusy}
          onRefresh={() => {
            setNotice(null)
            setOmittedPaths([])
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

        {!access.allowed ? (
          <StoragePremiumUpsell feature="duplicates" variant="duplicates" />
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
                    copiedPath={copiedPath}
                    deletingPath={deletingPath}
                    pendingDeletePaths={pendingDeletePaths}
                    mutatePending={mutatePending}
                    actionsDisabled={rowsBusy}
                    onToggle={togglePath}
                    onReveal={(path) => reveal.mutate(path)}
                    onCopy={(path) => void copyPath(path)}
                    keepLabel={t('duplicates.keep')}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function DuplicateGroupCard({
  group,
  selected,
  copiedPath,
  deletingPath,
  pendingDeletePaths,
  mutatePending,
  actionsDisabled,
  onToggle,
  onReveal,
  onCopy,
  keepLabel
}: {
  group: DuplicateGroup
  selected: string[]
  copiedPath: string | null
  deletingPath?: string
  pendingDeletePaths: string[]
  mutatePending: boolean
  actionsDisabled: boolean
  onToggle: (path: string) => void
  onReveal: (path: string) => void
  onCopy: (path: string) => void
  keepLabel: string
}): React.ReactElement {
  const { t } = useTranslation()
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
          const copied = copiedPath === path
          const inBatch = pendingDeletePaths.includes(path)
          const deleting = inBatch && (!mutatePending || deletingPath === path)
          const queued = inBatch && mutatePending && deletingPath !== path
          const name = path.split(/[/\\]/).pop() ?? path

          return (
            <li
              key={path}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40',
                isSelected && 'bg-primary/5',
                deleting && 'bg-destructive/5 ring-1 ring-inset ring-destructive/20',
                queued && 'opacity-60'
              )}
            >
              <input
                type="checkbox"
                className="rounded border-border"
                checked={isSelected}
                disabled={actionsDisabled}
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
                  {deleting ? (
                    <Badge className="gap-1 border-0 bg-destructive/10 text-destructive text-[10px]">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      {t('storage.deleting.rowShort')}
                    </Badge>
                  ) : queued ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {t('storage.deleting.queued')}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground" title={path}>
                  {path}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {deleting ? (
                  <div
                    className="flex h-8 items-center gap-1.5 px-1 text-xs font-medium text-destructive"
                    aria-live="polite"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  </div>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label={`Reveal ${name}`}
                      disabled={actionsDisabled}
                      onClick={() => onReveal(path)}
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
                        copied ? t('storage.copy.copied') : `Copy path for ${name}`
                      }
                      disabled={actionsDisabled}
                      onClick={() => onCopy(path)}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 animate-in zoom-in-50 duration-200" />
                      ) : (
                        <ClipboardCopy className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
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

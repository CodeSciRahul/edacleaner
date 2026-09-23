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
import { AppsEmptyState } from '@/features/apps/components/AppsEmptyState'
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { DuplicatesHero } from '@/features/storage/components/DuplicatesHero'
import { StorageSubnav } from '@/features/storage/components/StorageSubnav'
import { StorageFilterBar, storageFilterSelectClassName, storageFilterSelectWrapClassName } from '@/features/storage/components/StorageFilterBar'
import { FileTypeIcon } from '@/features/storage/components/FileTypeIcon'
import {
  SafetyRiskBadge,
  isDeletableSafety
} from '@/features/storage/components/SafetyRiskBadge'
import {
  useDeleteFiles,
  useDeleteFilesProgress,
  useDuplicates,
  useRevealInFolder,
  confirmMoveToTrash
} from '@/features/storage/hooks/useStorageData'
import { useInfiniteScrollReveal } from '@/features/storage/hooks/useInfiniteScrollReveal'
import {
  STORAGE_LIST_PAGE_SIZE,
  STORAGE_PAGE_DUPLICATES_LIMIT
} from '@/features/storage/lib/list-limits'
import type { FileSafetyInfo } from '@shared/interfaces'
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
    { limit: STORAGE_PAGE_DUPLICATES_LIMIT },
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
        const kept: string[] = []
        const keptSafety: FileSafetyInfo[] = []
        group.paths.forEach((p, i) => {
          if (!omittedSet.has(p) || pendingSet.has(p)) {
            kept.push(p)
            keptSafety.push(
              group.pathSafety?.[i] ?? {
                riskLevel: 'SAFE',
                deletionAllowed: true,
                reason: '',
                ruleId: null,
                category: null,
                regeneratable: false,
                recoverable: true,
                viaSymlink: false
              }
            )
          }
        })
        return { ...group, paths: kept, pathSafety: keptSafety, copies: kept.length }
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

  const listResetKey = [
    query,
    pathFilter,
    category,
    sizeFilter,
    minCopies,
    sortKey,
    omittedPaths.length,
    groups.length
  ].join('|')

  const {
    visibleItems: visibleGroups,
    sentinelRef,
    hasMore,
    visibleCount,
    total: filteredTotal
  } = useInfiniteScrollReveal(filtered, {
    pageSize: STORAGE_LIST_PAGE_SIZE,
    resetKey: listResetKey
  })

  const pathSafetyLookup = useMemo(() => {
    const map = new Map<string, FileSafetyInfo>()
    for (const group of filtered) {
      group.paths.forEach((p, i) => {
        if (group.pathSafety?.[i]) map.set(p, group.pathSafety[i])
      })
    }
    return map
  }, [filtered])

  const togglePath = (path: string): void => {
    const safety = pathSafetyLookup.get(path)
    if (safety && !isDeletableSafety(safety)) return
    setSelected((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const selectAllExceptKeep = (): void => {
    const extras = filtered.flatMap((g) =>
      g.paths
        .slice(1)
        .filter((_p, idx) => isDeletableSafety(g.pathSafety?.[idx + 1]))
    )
    const skipped =
      filtered.flatMap((g) => g.paths.slice(1)).length - extras.length
    setSelected((prev) => [...new Set([...prev, ...extras])])
    setNotice(
      skipped > 0
        ? t('storage.safety.selectSkipped')
        : `Selected ${extras.length} duplicate copy(ies), keeping originals.`
    )
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
        const blockedCount = result.blocked?.length ?? 0
        const blockedMsg =
          blockedCount > 0
            ? ` ${t('storage.safety.blockedNotice', { count: blockedCount })}`
            : ''
        setNotice(`Moved ${result.deleted.length} duplicate(s) to trash.${blockedMsg}`)
        await finishDeleteUi(result.deleted)
      } else {
        const blockedCount = result.blocked?.length ?? 0
        setNotice(
          blockedCount > 0
            ? t('storage.safety.blockedNotice', { count: blockedCount })
            : (result.failed[0]?.error ?? 'No files were deleted.')
        )
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
                  {t('duplicates.sortSize')}
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
              <label className={storageFilterSelectWrapClassName}>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {t('duplicates.sortCopies')}
                </span>
                <select
                  className={storageFilterSelectClassName}
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

            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card animate-in fade-in-0 duration-300">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-chart-disk/14 via-chart-disk/5 to-transparent"
                aria-hidden="true"
              />

              <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/80 px-4 py-3 text-xs text-muted-foreground sm:px-5">
                <span className="font-medium text-foreground/80">
                  {t('storage.list.showing', {
                    visible: visibleCount,
                    total: filteredTotal
                  })}
                </span>
                {groups.length !== filtered.length ? (
                  <>
                    <span className="text-border">·</span>
                    <span>{t('storage.list.scanned', { count: groups.length })}</span>
                  </>
                ) : null}
                <span className="text-border">·</span>
                <span>
                  {t('storage.list.wasteBytes', { bytes: formatBytes(wasteBytes) })}
                </span>
                {selected.length > 0 ? (
                  <>
                    <span className="text-border">·</span>
                    <span className="rounded-full bg-chart-disk/12 px-2 py-0.5 font-semibold tabular-nums text-chart-disk ring-1 ring-chart-disk/20">
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
                <div className="relative z-10 space-y-3 p-4 sm:p-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-xl border border-border/70 bg-background/40"
                    >
                      <div className="flex animate-pulse items-center gap-3 border-b border-border/70 px-4 py-3.5">
                        <div className="h-9 w-9 rounded-xl bg-muted" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="h-4 w-40 rounded-lg bg-muted" />
                          <div className="h-3 w-32 rounded-lg bg-muted" />
                        </div>
                        <div className="h-6 w-20 rounded-full bg-muted" />
                      </div>
                      <div className="space-y-0 divide-y divide-border/70">
                        {[0, 1].map((row) => (
                          <div
                            key={row}
                            className="flex animate-pulse items-center gap-3 px-4 py-3"
                          >
                            <div className="h-4 w-4 rounded bg-muted" />
                            <div className="h-4 flex-1 rounded-lg bg-muted" />
                            <div className="h-8 w-16 rounded-lg bg-muted" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="relative z-10">
                  <AppsEmptyState
                    icon={AlertCircle}
                    title={t('duplicates.loadError')}
                    description={
                      error instanceof Error ? error.message : t('duplicates.loadError')
                    }
                    actionLabel={t('common.retry')}
                    onAction={() => void refetch()}
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div className="relative z-10">
                  <AppsEmptyState
                    icon={Copy}
                    title={
                      groups.length === 0
                        ? t('duplicates.emptyNone')
                        : t('duplicates.emptyFilter')
                    }
                    description={
                      groups.length === 0
                        ? t('duplicates.emptyNoneHint')
                        : t('duplicates.emptyFilterHint')
                    }
                  />
                </div>
              ) : (
                <div className="relative z-10 space-y-3 p-4 sm:p-5">
                  {visibleGroups.map((group, index) => (
                    <DuplicateGroupCard
                      key={`${group.name}-${group.paths[0]}`}
                      group={group}
                      index={index}
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
                      duplicateLabel={t('duplicates.duplicate')}
                    />
                  ))}
                  <div
                    ref={sentinelRef}
                    className="flex items-center justify-center rounded-xl border border-dashed border-border/80 px-4 py-3 text-xs text-muted-foreground"
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

function DuplicateGroupCard({
  group,
  index,
  selected,
  copiedPath,
  deletingPath,
  pendingDeletePaths,
  mutatePending,
  actionsDisabled,
  onToggle,
  onReveal,
  onCopy,
  keepLabel,
  duplicateLabel
}: {
  group: DuplicateGroup
  index: number
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
  duplicateLabel: string
}): React.ReactElement {
  const { t } = useTranslation()
  const waste = group.sizeBytes * Math.max(0, group.copies - 1)
  const selectedInGroup = group.paths.filter((p) => selected.includes(p)).length

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/80 bg-background/50 shadow-sm',
        'transition-shadow hover:border-chart-disk/30 hover:shadow-md',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-300',
        selectedInGroup > 0 && 'border-chart-disk/35 ring-1 ring-chart-disk/15'
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-chart-disk/10 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/80 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {index + 1}
          </span>
          <FileTypeIcon fileName={group.name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{group.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('duplicates.groupMeta', {
                size: formatBytes(group.sizeBytes),
                count: group.copies
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground ring-1 ring-border/60">
            {group.copies}×
          </span>
          <Badge className="border-0 bg-chart-disk/12 font-semibold tabular-nums text-chart-disk shadow-none ring-1 ring-chart-disk/20">
            {t('duplicates.wasteLabel', { bytes: formatBytes(waste) })}
          </Badge>
        </div>
      </div>

      <ul className="relative z-10 divide-y divide-border/70">
        {group.paths.map((path, pathIndex) => {
          const isKeep = pathIndex === 0
          const isSelected = selected.includes(path)
          const copied = copiedPath === path
          const inBatch = pendingDeletePaths.includes(path)
          const deleting = inBatch && (!mutatePending || deletingPath === path)
          const queued = inBatch && mutatePending && deletingPath !== path
          const name = path.split(/[/\\]/).pop() ?? path
          const safety = group.pathSafety?.[pathIndex]
          const canDelete = isDeletableSafety(safety)
          const riskLabel =
            safety?.riskLevel === 'PROTECTED'
              ? t('storage.safety.protected')
              : safety?.riskLevel === 'HIGH_RISK'
                ? t('storage.safety.highRisk')
                : safety?.riskLevel === 'CAUTION'
                  ? t('storage.safety.caution')
                  : ''

          return (
            <li
              key={path}
              className={cn(
                'group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-chart-disk/[0.04]',
                isSelected && 'bg-chart-disk/[0.06]',
                deleting && 'bg-destructive/5 ring-1 ring-inset ring-destructive/20',
                queued && 'opacity-60',
                !canDelete && 'bg-muted/10',
                isKeep && 'bg-success/[0.03]'
              )}
            >
              <input
                type="checkbox"
                className="rounded border-border"
                checked={isSelected}
                disabled={actionsDisabled || !canDelete}
                onChange={() => onToggle(path)}
                aria-label={`Select ${name}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                  {isKeep ? (
                    <Badge className="border-0 bg-success/12 text-[10px] font-semibold text-success shadow-none ring-1 ring-success/20">
                      {keepLabel}
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-chart-disk/25 bg-chart-disk/8 text-[10px] font-medium text-chart-disk"
                    >
                      {duplicateLabel}
                    </Badge>
                  )}
                  {safety ? <SafetyRiskBadge safety={safety} label={riskLabel} /> : null}
                  {deleting ? (
                    <Badge className="gap-1 border-0 bg-destructive/10 text-[10px] text-destructive shadow-none">
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                      {t('storage.deleting.rowShort')}
                    </Badge>
                  ) : queued ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {t('storage.deleting.queued')}
                    </Badge>
                  ) : null}
                </div>
                {safety && safety.riskLevel !== 'SAFE' ? (
                  <p
                    className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground"
                    title={safety.reason}
                  >
                    {safety.reason}
                  </p>
                ) : null}
                <p className="mt-0.5 truncate text-xs text-muted-foreground" title={path}>
                  {path}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 opacity-80 transition-opacity group-hover:opacity-100">
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
                      className="h-8 w-8 rounded-lg p-0"
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
                        'h-8 w-8 rounded-lg p-0 transition-colors',
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

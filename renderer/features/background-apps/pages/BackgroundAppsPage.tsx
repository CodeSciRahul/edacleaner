import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Layers,
  Radio,
  RefreshCw,
  Search,
  Square,
  User,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toolbar } from '@/components/desktop/Toolbar'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import {
  useLiveBackgroundProcesses,
  useStopBackgroundProcesses
} from '@/features/performance/hooks/useBoost'
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { AppsEmptyState } from '@/features/apps/components/AppsEmptyState'

type StatusFilter = 'all' | 'safe' | 'selected'
type SortKey = 'memory' | 'cpu' | 'name'

export function BackgroundAppsPage(): React.ReactElement {
  const {
    processes: apps,
    updatedAt,
    isLoading,
    isFetching,
    isError,
    error,
    isLive,
    refresh
  } = useLiveBackgroundProcesses()
  const stopProcesses = useStopBackgroundProcesses()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('memory')
  const [selectedPids, setSelectedPids] = useState<number[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = apps.filter((app) => {
      if (statusFilter === 'safe' && !app.safeToTerminate) return false
      if (statusFilter === 'selected' && !selectedPids.includes(app.pid)) return false
      if (!q) return true
      return (
        app.name.toLowerCase().includes(q) ||
        String(app.pid).includes(q)
      )
    })

    list = [...list].sort((a, b) => {
      if (sortKey === 'cpu') return b.cpuPercent - a.cpuPercent || a.name.localeCompare(b.name)
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      return b.memoryBytes - a.memoryBytes || a.name.localeCompare(b.name)
    })

    return list
  }, [apps, query, statusFilter, sortKey, selectedPids])

  const totalMemory = useMemo(
    () => filtered.reduce((sum, app) => sum + app.memoryBytes, 0),
    [filtered]
  )

  // Drop selections for PIDs that disappeared from the live list
  useEffect(() => {
    const livePids = new Set(apps.map((app) => app.pid))
    setSelectedPids((prev) => {
      const next = prev.filter((pid) => livePids.has(pid))
      return next.length === prev.length ? prev : next
    })
  }, [apps])

  const togglePid = (pid: number): void => {
    setSelectedPids((prev) =>
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    )
  }

  const toggleAllVisible = (): void => {
    const visibleSafe = filtered.filter((a) => a.safeToTerminate).map((a) => a.pid)
    const allSelected = visibleSafe.every((pid) => selectedPids.includes(pid))
    if (allSelected) {
      setSelectedPids((prev) => prev.filter((pid) => !visibleSafe.includes(pid)))
    } else {
      setSelectedPids((prev) => [...new Set([...prev, ...visibleSafe])])
    }
  }

  const handleStop = async (
    targets: Array<{ pid: number; name: string }>
  ): Promise<void> => {
    setNotice(null)
    const result = await stopProcesses.mutateAsync(targets)
    if (result.cancelled) return

    if (result.terminated > 0) {
      setNotice(`Stopped ${result.terminated} process(es).`)
      setSelectedPids((prev) => prev.filter((pid) => !targets.some((t) => t.pid === pid)))
      void refresh()
    } else {
      setNotice(
        result.failed[0]?.error ??
          result.skipped[0]?.reason ??
          result.detail ??
          'No processes were stopped.'
      )
    }
  }

  const displayName = (processName: string): string =>
    processName.replace(/\.exe$/i, '')

  const updatedLabel =
    updatedAt == null
      ? 'Waiting…'
      : `Updated ${new Date(updatedAt).toLocaleTimeString()}`

  return (
    <>
      <Toolbar
        title="Background Applications"
        description="Live view of safe background processes — updates while this page is open."
        actions={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium',
                isLive
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-border bg-muted text-muted-foreground'
              )}
              title={isLive ? 'Receiving live process updates' : 'Live updates paused or starting'}
            >
              <Radio className={cn('h-3.5 w-3.5', isLive && 'animate-pulse')} />
              {isLive ? 'Live' : 'Offline'}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2"
              disabled={isFetching}
              onClick={() => {
                setNotice(null)
                void refresh()
              }}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-9 gap-2"
              disabled={selectedPids.length === 0 || stopProcesses.isPending}
              onClick={() => {
                const targets = apps
                  .filter((app) => selectedPids.includes(app.pid))
                  .map((app) => ({ pid: app.pid, name: app.name }))
                void handleStop(targets)
              }}
            >
              <Square className="h-3.5 w-3.5" />
              Stop selected
              {selectedPids.length > 0 ? ` (${selectedPids.length})` : ''}
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-content-pad">
        <PageBreadcrumb
          items={[
            { label: 'Performance', href: '/performance' },
            { label: 'Background Applications' }
          ]}
        />

        <div className="grid gap-3 sm:grid-cols-4">
          <SummaryChip label="Listed" value={String(apps.length)} />
          <SummaryChip label="Visible" value={String(filtered.length)} />
          <SummaryChip label="Memory (visible)" value={formatBytes(totalMemory)} />
          <SummaryChip label="Last update" value={updatedLabel} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-border bg-surface/50 p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by app or PID…"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Search background applications"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'safe', 'selected'] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={statusFilter === filter ? 'default' : 'outline'}
                  className="h-9 capitalize"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter}
                </Button>
              ))}
              <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-2 text-xs text-muted-foreground">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="bg-transparent text-foreground outline-none"
                  aria-label="Sort background apps"
                >
                  <option value="memory">Memory</option>
                  <option value="cpu">CPU</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
          </div>

          {notice ? (
            <div
              className="border-b border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground"
              role="status"
            >
              {notice}
            </div>
          ) : null}

          {isError ? (
            <AppsEmptyState
              icon={AlertCircle}
              title="Couldn’t load background apps"
              description={
                error instanceof Error ? error.message : 'Something went wrong while scanning processes.'
              }
              actionLabel="Try again"
              onAction={() => void refresh()}
            />
          ) : isLoading ? (
            <div className="space-y-0 divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
                  <div className="h-4 w-4 rounded bg-muted" />
                  <div className="h-9 w-9 rounded-lg bg-muted" />
                  <div className="h-4 flex-1 rounded bg-muted" />
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <AppsEmptyState
              icon={Layers}
              title={apps.length === 0 ? 'No background apps found' : 'No matches'}
              description={
                apps.length === 0
                  ? 'Safe-to-stop processes will appear here after a scan.'
                  : 'Try a different search or clear your filters.'
              }
              actionLabel="Refresh"
              onAction={() => void refresh()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        aria-label="Select all visible"
                        checked={
                          filtered.filter((a) => a.safeToTerminate).length > 0 &&
                          filtered
                            .filter((a) => a.safeToTerminate)
                            .every((a) => selectedPids.includes(a.pid))
                        }
                        onChange={toggleAllVisible}
                      />
                    </th>
                    <th className="px-2 py-3 font-medium">Application</th>
                    <th className="px-2 py-3 font-medium">Process</th>
                    <th className="px-2 py-3 font-medium">Type</th>
                    <th className="px-2 py-3 font-medium">CPU</th>
                    <th className="px-2 py-3 font-medium">Memory</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((app) => {
                    const selected = selectedPids.includes(app.pid)
                    const stopping =
                      stopProcesses.isPending &&
                      (stopProcesses.variables?.some((t) => t.pid === app.pid) ?? false)
                    const appLabel = displayName(app.name)

                    return (
                      <tr
                        key={app.pid}
                        className={cn(
                          'transition-colors hover:bg-muted/40',
                          selected && 'bg-primary/5'
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={selected}
                            disabled={!app.safeToTerminate || stopProcesses.isPending}
                            onChange={() => togglePid(app.pid)}
                            aria-label={`Select ${appLabel}`}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            {app.iconDataUrl ? (
                              <img
                                src={app.iconDataUrl}
                                alt=""
                                className="h-9 w-9 shrink-0 rounded-lg"
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold uppercase text-primary">
                                {appLabel.slice(0, 2)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{appLabel}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                PID {app.pid}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                          {app.name}
                        </td>
                        <td className="px-2 py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {app.safeToTerminate ? (
                              <>
                                <User className="h-3.5 w-3.5" /> User
                              </>
                            ) : (
                              <>
                                <Shield className="h-3.5 w-3.5" /> Protected
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-2 py-3 tabular-nums text-muted-foreground">
                          {app.cpuPercent > 0 ? `${app.cpuPercent.toFixed(1)}` : '—'}
                        </td>
                        <td className="px-2 py-3 tabular-nums font-medium text-foreground">
                          {formatBytes(app.memoryBytes)}
                        </td>
                        <td className="px-2 py-3">
                          <Badge className="border-0 bg-success/10 text-success">Running</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5"
                            disabled={!app.safeToTerminate || stopProcesses.isPending}
                            onClick={() =>
                              void handleStop([{ pid: app.pid, name: app.name }])
                            }
                          >
                            <Square className="h-3 w-3" />
                            {stopping ? 'Stopping…' : 'Stop'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Only user-safe processes are listed. System-critical processes cannot be stopped from
            here.
          </div>
        </div>
      </div>
    </>
  )
}

function SummaryChip({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

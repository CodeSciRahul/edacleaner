import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Eye,
  Info,
  Power,
  RefreshCw,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toolbar } from '@/components/desktop/Toolbar'
import { cn } from '@/utils/cn'
import type { StartupAppEntry, StartupImpact } from '@shared/interfaces'
import {
  useRefreshStartupApps,
  useStartupApps,
  useToggleStartupApp
} from '@/features/performance/hooks/useStartupApps'
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { AppsEmptyState } from '@/features/apps/components/AppsEmptyState'
import { ToggleSwitch } from '@/features/apps/components/ToggleSwitch'

type StatusFilter = 'all' | 'enabled' | 'disabled' | 'toggleable'
type SortKey = 'name' | 'impact' | 'status' | 'source'

const impactStyles: Record<StartupImpact, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-success/10 text-success',
  unknown: 'bg-muted text-muted-foreground'
}

const impactRank: Record<StartupImpact, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3
}

export function StartupAppsPage(): React.ReactElement {
  const { data, isLoading, isError, error, refetch } = useStartupApps()
  const refresh = useRefreshStartupApps()
  const toggle = useToggleStartupApp()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  const entries = data?.entries ?? []
  const enabledCount = entries.filter((e) => e.enabled).length
  const toggleableCount = entries.filter((e) => e.canToggle).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = entries.filter((entry) => {
      if (statusFilter === 'enabled' && !entry.enabled) return false
      if (statusFilter === 'disabled' && entry.enabled) return false
      if (statusFilter === 'toggleable' && !entry.canToggle) return false
      if (!q) return true
      return (
        entry.name.toLowerCase().includes(q) ||
        entry.source.toLowerCase().includes(q) ||
        entry.location.toLowerCase().includes(q)
      )
    })

    list = [...list].sort((a, b) => {
      if (sortKey === 'impact') {
        return impactRank[a.impact] - impactRank[b.impact] || a.name.localeCompare(b.name)
      }
      if (sortKey === 'status') {
        return Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name)
      }
      if (sortKey === 'source') {
        return a.source.localeCompare(b.source) || a.name.localeCompare(b.name)
      }
      return a.name.localeCompare(b.name)
    })

    return list
  }, [entries, query, statusFilter, sortKey])

  const handleToggle = async (entry: StartupAppEntry): Promise<void> => {
    setNotice(null)
    const result = await toggle.mutateAsync({
      id: entry.id,
      enabled: !entry.enabled,
      name: entry.name
    })
    if (result.cancelled) return

    if (result.success) {
      setNotice({
        type: 'success',
        text: `${entry.name} ${entry.enabled ? 'disabled' : 'enabled'} for next sign-in.`
      })
    } else {
      setNotice({
        type: 'error',
        text: result.error ?? `Failed to update ${entry.name}.`
      })
    }
  }

  return (
    <>
      <Toolbar
        title="Startup Applications"
        description="Control which apps launch when you sign in. Changes are reversible."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2"
            disabled={refresh.isPending || isLoading}
            onClick={() => {
              setNotice(null)
              void refresh.mutateAsync()
            }}
          >
            <RefreshCw className={cn('h-4 w-4', refresh.isPending && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      <div className="space-y-4 p-content-pad">
        <PageBreadcrumb
          items={[
            { label: 'Performance', href: '/performance' },
            { label: 'Startup Applications' }
          ]}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryChip label="Total" value={String(entries.length)} />
          <SummaryChip label="Enabled" value={String(enabledCount)} />
          <SummaryChip label="Manageable" value={String(toggleableCount)} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div className="flex flex-col gap-3 border-b border-border bg-surface/50 p-4 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, source, or path…"
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Search startup applications"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'enabled', 'disabled', 'toggleable'] as const).map((filter) => (
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
                  aria-label="Sort startup apps"
                >
                  <option value="name">Name</option>
                  <option value="impact">Impact</option>
                  <option value="status">Status</option>
                  <option value="source">Source</option>
                </select>
              </label>
            </div>
          </div>

          {notice ? (
            <div
              className={cn(
                'border-b border-border px-4 py-2.5 text-sm',
                notice.type === 'success'
                  ? 'bg-success/10 text-success'
                  : 'bg-destructive/10 text-destructive'
              )}
              role="status"
            >
              {notice.text}
            </div>
          ) : null}

          {data?.warnings?.length ? (
            <div className="flex items-start gap-2 border-b border-border bg-warning/10 px-4 py-2.5 text-xs text-warning">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{data.warnings.join(' · ')}</span>
            </div>
          ) : null}

          {isError ? (
            <AppsEmptyState
              icon={AlertCircle}
              title="Couldn’t load startup apps"
              description={
                error instanceof Error ? error.message : 'Failed to read startup locations.'
              }
              actionLabel="Try again"
              onAction={() => void refetch()}
            />
          ) : isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-4">
                  <div className="h-9 w-9 rounded-lg bg-muted" />
                  <div className="h-4 flex-1 rounded bg-muted" />
                  <div className="h-6 w-11 rounded-full bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <AppsEmptyState
              icon={Power}
              title={entries.length === 0 ? 'No startup apps found' : 'No matches'}
              description={
                entries.length === 0
                  ? 'User-level startup entries will appear here when detected.'
                  : 'Try another search or filter.'
              }
              actionLabel="Refresh"
              onAction={() => void refresh.mutateAsync()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-medium">Application</th>
                    <th className="px-2 py-3 font-medium">Impact</th>
                    <th className="px-2 py-3 font-medium">Source</th>
                    <th className="px-2 py-3 font-medium">Publisher</th>
                    <th className="px-2 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((entry) => {
                    const expanded = expandedId === entry.id
                    const busy = toggle.isPending && toggle.variables?.id === entry.id

                    return (
                      <tr key={entry.id} className="align-top transition-colors hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="flex w-full items-start gap-3 text-left"
                            onClick={() => setExpandedId(expanded ? null : entry.id)}
                            aria-expanded={expanded}
                          >
                            {entry.iconDataUrl ? (
                              <img
                                src={entry.iconDataUrl}
                                alt=""
                                className="mt-0.5 h-9 w-9 shrink-0 rounded-lg"
                              />
                            ) : (
                              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Power className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{entry.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {entry.location}
                              </p>
                              {expanded ? (
                                <div className="mt-2 space-y-1 rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                                  {entry.details ? <p>{entry.details}</p> : null}
                                  {entry.protectedReason ? (
                                    <p className="text-warning">{entry.protectedReason}</p>
                                  ) : null}
                                  <p className="inline-flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    Click row to collapse details
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </button>
                        </td>
                        <td className="px-2 py-3">
                          <Badge className={cn('border-0 capitalize', impactStyles[entry.impact])}>
                            {entry.impact}
                          </Badge>
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">{entry.source}</td>
                        <td className="px-2 py-3 text-muted-foreground">—</td>
                        <td className="px-2 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                              entry.enabled
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {entry.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          {!entry.canToggle ? (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              View only
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <ToggleSwitch
                              checked={entry.enabled}
                              disabled={!entry.canToggle || busy}
                              aria-label={`${entry.enabled ? 'Disable' : 'Enable'} ${entry.name}`}
                              onCheckedChange={() => void handleToggle(entry)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            Toggles apply on the next sign-in. Entries are never permanently deleted — disable is
            always reversible when manageable.
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

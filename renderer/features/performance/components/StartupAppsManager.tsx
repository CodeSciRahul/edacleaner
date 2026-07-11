import { useMemo, useState } from 'react'
import { Power, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import type { StartupAppEntry, StartupImpact } from '@shared/interfaces'
import {
  useRefreshStartupApps,
  useStartupApps,
  useToggleStartupApp
} from '@/features/performance/hooks/useStartupApps'

type StatusFilter = 'all' | 'enabled' | 'disabled'
type SortKey = 'name' | 'impact' | 'status'

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

export function StartupAppsManager(): React.ReactElement {
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = entries.filter((entry) => {
      if (statusFilter === 'enabled' && !entry.enabled) return false
      if (statusFilter === 'disabled' && entry.enabled) return false
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
      return a.name.localeCompare(b.name)
    })

    return list
  }, [entries, query, statusFilter, sortKey])

  const enabledCount = entries.filter((e) => e.enabled).length

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
        text: `${entry.name} ${entry.enabled ? 'disabled' : 'enabled'} successfully.`
      })
    } else {
      setNotice({
        type: 'error',
        text: result.error ?? `Failed to update ${entry.name}.`
      })
    }
  }

  return (
    <section aria-label="Startup apps manager" className="xl:col-span-2">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-section-title text-foreground">Startup Applications</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage apps that launch when you sign in. Only user-level entries can be changed.
          </p>
        </div>
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
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, source, or path…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search startup apps"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'enabled', 'disabled'] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={statusFilter === filter ? 'default' : 'outline'}
                className="h-8 capitalize"
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </Button>
            ))}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
              aria-label="Sort startup apps"
            >
              <option value="name">Sort: Name</option>
              <option value="impact">Sort: Impact</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>
        </div>

        <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
          {isLoading
            ? 'Loading startup applications…'
            : `${filtered.length} shown · ${enabledCount} enabled · ${entries.length} total`}
        </div>

        {notice ? (
          <div
            className={cn(
              'border-b border-border px-4 py-2 text-sm',
              notice.type === 'success' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
            )}
            role="status"
          >
            {notice.text}
          </div>
        ) : null}

        {data?.warnings?.length ? (
          <div className="border-b border-border px-4 py-2 text-xs text-warning">
            {data.warnings.join(' · ')}
          </div>
        ) : null}

        {isError ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to load startup apps'}
            </p>
            <Button size="sm" className="mt-3" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">Scanning startup locations…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            No startup applications match your filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((entry) => {
              const expanded = expandedId === entry.id
              const busy = toggle.isPending && toggle.variables?.id === entry.id

              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() => setExpandedId(expanded ? null : entry.id)}
                      aria-expanded={expanded}
                    >
                      {entry.iconDataUrl ? (
                        <img
                          src={entry.iconDataUrl}
                          alt=""
                          className="mt-0.5 h-8 w-8 shrink-0 rounded"
                        />
                      ) : (
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted">
                          <Power className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{entry.source}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge className={cn('border-0', impactStyles[entry.impact])}>
                            {entry.impact} impact
                          </Badge>
                          {!entry.canToggle ? (
                            <Badge variant="outline" className="text-[10px]">
                              View only
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          entry.enabled
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {entry.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Button
                        size="sm"
                        variant={entry.enabled ? 'outline' : 'default'}
                        className="h-8"
                        disabled={!entry.canToggle || busy}
                        title={
                          entry.canToggle
                            ? entry.enabled
                              ? 'Disable at startup'
                              : 'Enable at startup'
                            : entry.protectedReason ?? 'Cannot modify this entry'
                        }
                        onClick={() => void handleToggle(entry)}
                      >
                        {busy ? '…' : entry.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Location: </span>
                        {entry.location}
                      </p>
                      {entry.details ? (
                        <p className="mt-1">
                          <span className="font-medium text-foreground">Details: </span>
                          {entry.details}
                        </p>
                      ) : null}
                      {entry.protectedReason ? (
                        <p className="mt-1 text-warning">
                          <span className="font-medium">Protected: </span>
                          {entry.protectedReason}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Changes apply to the next sign-in. Entries are never permanently deleted — disable is
          reversible.
        </p>
      </div>
    </section>
  )
}

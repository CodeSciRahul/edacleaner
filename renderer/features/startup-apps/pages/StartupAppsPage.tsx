import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Eye,
  Info,
  Power,
  Search
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
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
import { StartupAppsHero } from '@/features/startup-apps/components/StartupAppsHero'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { FeatureLockedCallout } from '@/features/entitlements/components/FeatureLockedCallout'
import { FeatureTeaserBlock } from '@/features/entitlements/components/FeatureTeaserBlock'

type StatusFilter = 'all' | 'enabled' | 'disabled' | 'toggleable'
type SortKey = 'name' | 'impact' | 'status' | 'source'

const impactStyles: Record<StartupImpact, string> = {
  high: 'bg-destructive/12 text-destructive ring-1 ring-destructive/20',
  medium: 'bg-warning/12 text-warning ring-1 ring-warning/20',
  low: 'bg-success/12 text-success ring-1 ring-success/20',
  unknown: 'bg-muted/80 text-muted-foreground ring-1 ring-border/60'
}

const impactRank: Record<StartupImpact, number> = {
  high: 0,
  medium: 1,
  low: 2,
  unknown: 3
}

const filterLabelKeys: Record<StatusFilter, TranslationKey> = {
  all: 'startupApps.filterAll',
  enabled: 'startupApps.filterEnabled',
  disabled: 'startupApps.filterDisabled',
  toggleable: 'startupApps.filterToggleable'
}

const sortLabelKeys: Record<SortKey, TranslationKey> = {
  name: 'startupApps.sortName',
  impact: 'startupApps.sortImpact',
  status: 'startupApps.sortStatus',
  source: 'startupApps.sortSource'
}

export function StartupAppsPage(): React.ReactElement {
  const { t } = useTranslation()
  const access = useFeatureAccess('startup_apps')
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

  const PREVIEW_COUNT = 5
  const showTeaser = !access.allowed && filtered.length > PREVIEW_COUNT
  const visibleEntries = showTeaser ? filtered.slice(0, PREVIEW_COUNT) : filtered
  const teaserEntries = showTeaser ? filtered.slice(PREVIEW_COUNT, PREVIEW_COUNT + 5) : []

  const handleToggle = async (entry: StartupAppEntry): Promise<void> => {
    if (!access.guard()) return
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
        text: entry.enabled
          ? t('startupApps.noticeDisabled', { name: entry.name })
          : t('startupApps.noticeEnabled', { name: entry.name })
      })
    } else {
      setNotice({
        type: 'error',
        text: result.error ?? t('startupApps.noticeFailed', { name: entry.name })
      })
    }
  }

  return (
    <div className="space-y-4 p-content-pad">
      <StartupAppsHero
        isLoading={isLoading}
        isRefreshing={refresh.isPending}
        accessAllowed={access.allowed}
        totalCount={entries.length}
        enabledCount={enabledCount}
        manageableCount={toggleableCount}
        onRefresh={() => {
          setNotice(null)
          void refresh.mutateAsync()
        }}
      />

      <FeatureLockedCallout feature="startup_apps" compact />
      <PageBreadcrumb
        items={[
          { label: t('performance.title'), href: '/performance' },
          { label: t('startupApps.title') }
        ]}
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-warning/14 via-warning/5 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-3 border-b border-border/80 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('startupApps.searchPlaceholder')}
              className="h-10 w-full rounded-xl border border-border/80 bg-background/80 pl-9 pr-3 text-sm outline-none backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('startupApps.searchAria')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl border border-border/80 bg-background/60 p-1 backdrop-blur-sm">
              {(['all', 'enabled', 'disabled', 'toggleable'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    'h-8 rounded-lg px-2.5 text-xs font-medium transition-colors',
                    statusFilter === filter
                      ? 'bg-warning/15 text-warning shadow-sm ring-1 ring-warning/25'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  {t(filterLabelKeys[filter])}
                </button>
              ))}
            </div>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-2.5 text-xs text-muted-foreground backdrop-blur-sm">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-transparent text-foreground outline-none"
                aria-label={t('startupApps.sortAria')}
              >
                {(Object.keys(sortLabelKeys) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {t(sortLabelKeys[key])}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {notice ? (
          <div
            className={cn(
              'relative z-10 border-b border-border/80 px-4 py-2.5 text-sm sm:px-5',
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
          <div className="relative z-10 flex items-start gap-2 border-b border-border/80 bg-warning/10 px-4 py-2.5 text-xs text-warning sm:px-5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{data.warnings.join(' · ')}</span>
          </div>
        ) : null}

        {isError ? (
          <div className="relative z-10">
            <AppsEmptyState
              icon={AlertCircle}
              title={t('startupApps.loadError')}
              description={
                error instanceof Error ? error.message : t('startupApps.loadErrorDesc')
              }
              actionLabel={t('common.retry')}
              onAction={() => void refetch()}
            />
          </div>
        ) : isLoading ? (
          <div className="relative z-10 divide-y divide-border/70">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3.5 px-4 py-3.5 sm:px-5">
                <div className="h-9 w-9 rounded-xl bg-muted" />
                <div className="h-4 flex-1 rounded-lg bg-muted" />
                <div className="h-5 w-14 rounded-full bg-muted" />
                <div className="h-6 w-11 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="relative z-10">
            <AppsEmptyState
              icon={Power}
              title={t('startupApps.empty')}
              description={t('startupApps.emptyHint')}
              actionLabel={t('common.refresh')}
              onAction={() => void refresh.mutateAsync()}
            />
          </div>
        ) : (
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-card/90 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                <tr className="border-b border-border/80">
                  <th className="px-4 py-3 font-medium sm:px-5">{t('backgroundApps.col.app')}</th>
                  <th className="px-2 py-3 font-medium">{t('startupApps.sortImpact')}</th>
                  <th className="hidden px-2 py-3 font-medium md:table-cell">
                    {t('startupApps.sortSource')}
                  </th>
                  <th className="px-2 py-3 font-medium">{t('startupApps.sortStatus')}</th>
                  <th className="px-4 py-3 text-right font-medium sm:px-5">
                    {t('startupApps.enabled')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visibleEntries.map((entry) => {
                  const expanded = expandedId === entry.id
                  const busy = toggle.isPending && toggle.variables?.id === entry.id

                  return (
                    <tr
                      key={entry.id}
                      className="group align-middle transition-colors hover:bg-warning/[0.04]"
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 text-left"
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                          aria-expanded={expanded}
                          title={entry.location}
                        >
                          {entry.iconDataUrl ? (
                            <img
                              src={entry.iconDataUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border/60"
                              draggable={false}
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 ring-1 ring-border/60">
                              <Power className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {entry.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground md:hidden">
                              {entry.source}
                            </p>
                            {expanded ? (
                              <div className="mt-2 space-y-1.5 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                <p className="break-all font-mono text-[11px] leading-relaxed text-foreground/80">
                                  {entry.location}
                                </p>
                                {entry.details ? <p>{entry.details}</p> : null}
                                {entry.protectedReason ? (
                                  <p className="text-warning">{entry.protectedReason}</p>
                                ) : null}
                                <p className="inline-flex items-center gap-1 text-muted-foreground">
                                  <Eye className="h-3 w-3" />
                                  {t('startupApps.collapseHint')}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          className={cn(
                            'border-0 capitalize shadow-none',
                            impactStyles[entry.impact]
                          )}
                        >
                          {entry.impact}
                        </Badge>
                      </td>
                      <td className="hidden px-2 py-3 md:table-cell">
                        <span className="inline-flex max-w-[9.5rem] truncate rounded-lg bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                          {entry.source}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                              entry.enabled
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted/80 text-muted-foreground'
                            )}
                          >
                            {entry.enabled
                              ? t('startupApps.filterEnabled')
                              : t('startupApps.filterDisabled')}
                          </span>
                          {!entry.canToggle ? (
                            <Badge
                              variant="outline"
                              className="h-5 border-border/70 px-1.5 text-[10px] font-medium text-muted-foreground"
                            >
                              {t('startupApps.viewOnly')}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex justify-end">
                          <ToggleSwitch
                            checked={entry.enabled}
                            disabled={access.allowed ? !entry.canToggle || busy : false}
                            aria-label={`${entry.enabled ? t('startupApps.disable') : t('startupApps.enable')} ${entry.name}`}
                            onCheckedChange={() => void handleToggle(entry)}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {showTeaser ? (
              <FeatureTeaserBlock feature="startup_apps" maxHeightClassName="max-h-48">
                <div className="divide-y divide-border/70">
                  {teaserEntries.map((entry) => (
                    <div
                      key={`teaser-${entry.id}`}
                      className="flex items-center gap-3 px-4 py-3 sm:px-5"
                    >
                      {entry.iconDataUrl ? (
                        <img
                          src={entry.iconDataUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border/60"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/80 ring-1 ring-border/60">
                          <Power className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {entry.name}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {entry.source} · {entry.impact}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </FeatureTeaserBlock>
            ) : null}
          </div>
        )}

        <div className="relative z-10 border-t border-border/80 px-4 py-3 text-xs text-muted-foreground sm:px-5">
          {t('startupApps.footerHint')}
        </div>
      </div>
    </div>
  )
}

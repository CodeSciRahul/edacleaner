import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpDown,
  Layers,
  Search,
  Square,
  User,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import {
  useLiveBackgroundProcesses,
  useStopBackgroundProcesses
} from '@/features/performance/hooks/useBoost'
import { PageBreadcrumb } from '@/features/apps/components/PageBreadcrumb'
import { AppsEmptyState } from '@/features/apps/components/AppsEmptyState'
import { BackgroundAppsHero } from '@/features/background-apps/components/BackgroundAppsHero'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { FeatureLockedCallout } from '@/features/entitlements/components/FeatureLockedCallout'
import { FeatureTeaserBlock } from '@/features/entitlements/components/FeatureTeaserBlock'

type StatusFilter = 'all' | 'safe'
type SortKey = 'memory' | 'cpu' | 'name'

const filterLabelKeys: Record<StatusFilter, TranslationKey> = {
  all: 'backgroundApps.filterAll',
  safe: 'backgroundApps.filterSafe'
}

const sortLabelKeys: Record<SortKey, TranslationKey> = {
  memory: 'backgroundApps.sortMemory',
  cpu: 'backgroundApps.sortCpu',
  name: 'backgroundApps.sortName'
}

function displayName(processName: string): string {
  return processName.replace(/\.exe$/i, '')
}

export function BackgroundAppsPage(): React.ReactElement {
  const { t } = useTranslation()
  const access = useFeatureAccess('background_apps')
  const {
    processes: apps,
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
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = apps.filter((app) => {
      if (statusFilter === 'safe' && !app.safeToTerminate) return false
      if (!q) return true
      return app.name.toLowerCase().includes(q) || String(app.pid).includes(q)
    })

    list = [...list].sort((a, b) => {
      if (sortKey === 'cpu') return b.cpuPercent - a.cpuPercent || a.name.localeCompare(b.name)
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      return b.memoryBytes - a.memoryBytes || a.name.localeCompare(b.name)
    })

    return list
  }, [apps, query, statusFilter, sortKey])

  const totalMemory = useMemo(
    () => apps.reduce((sum, app) => sum + app.memoryBytes, 0),
    [apps]
  )

  const handleStop = async (targets: Array<{ pid: number; name: string }>): Promise<void> => {
    if (!access.guard()) return
    setNotice(null)
    const result = await stopProcesses.mutateAsync(targets)
    if (result.cancelled) return

    if (result.terminated > 0) {
      setNotice({
        type: 'success',
        text: t('backgroundApps.noticeStopped', { count: result.terminated })
      })
      void refresh()
    } else {
      setNotice({
        type: 'error',
        text:
          result.failed[0]?.error ??
          result.skipped[0]?.reason ??
          result.detail ??
          t('backgroundApps.noticeNone')
      })
    }
  }

  const PREVIEW_COUNT = 5
  const showTeaser = !access.allowed && filtered.length > PREVIEW_COUNT
  const visibleApps = showTeaser ? filtered.slice(0, PREVIEW_COUNT) : filtered
  const teaserApps = showTeaser ? filtered.slice(PREVIEW_COUNT, PREVIEW_COUNT + 5) : []

  return (
    <div className="space-y-4 p-content-pad">
      <BackgroundAppsHero
        isLoading={isLoading}
        isRefreshing={isFetching}
        isLive={isLive}
        accessAllowed={access.allowed}
        listedCount={apps.length}
        memoryBytes={totalMemory}
        onRefresh={() => {
          setNotice(null)
          void refresh()
        }}
      />

      <FeatureLockedCallout feature="background_apps" compact />
      <PageBreadcrumb
        items={[
          { label: t('performance.title'), href: '/performance' },
          { label: t('backgroundApps.title') }
        ]}
      />

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-chart-ram/14 via-chart-ram/5 to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col gap-3 border-b border-border/80 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('backgroundApps.searchPlaceholder')}
              className="h-10 w-full rounded-xl border border-border/80 bg-background/80 pl-9 pr-3 text-sm outline-none backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t('backgroundApps.searchAria')}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-xl border border-border/80 bg-background/60 p-1 backdrop-blur-sm">
              {(['all', 'safe'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    'h-8 rounded-lg px-2.5 text-xs font-medium transition-colors',
                    statusFilter === filter
                      ? 'bg-chart-ram/15 text-chart-ram shadow-sm ring-1 ring-chart-ram/25'
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
                aria-label={t('backgroundApps.sortAria')}
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

        {isError ? (
          <div className="relative z-10">
            <AppsEmptyState
              icon={AlertCircle}
              title={t('backgroundApps.loadError')}
              description={
                error instanceof Error ? error.message : t('backgroundApps.loadErrorDesc')
              }
              actionLabel={t('common.retry')}
              onAction={() => void refresh()}
            />
          </div>
        ) : isLoading ? (
          <div className="relative z-10 divide-y divide-border/70">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-3.5 px-4 py-3.5 sm:px-5">
                <div className="h-9 w-9 rounded-xl bg-muted" />
                <div className="h-4 flex-1 rounded-lg bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
                <div className="h-8 w-16 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="relative z-10">
            <AppsEmptyState
              icon={Layers}
              title={t('backgroundApps.empty')}
              description={t('backgroundApps.emptyHint')}
              actionLabel={t('common.refresh')}
              onAction={() => void refresh()}
            />
          </div>
        ) : (
          <div className="relative z-10 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-card/90 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                <tr className="border-b border-border/80">
                  <th className="px-4 py-3 font-medium sm:px-5">{t('backgroundApps.col.app')}</th>
                  <th className="px-2 py-3 font-medium">{t('backgroundApps.col.type')}</th>
                  <th className="px-2 py-3 font-medium">{t('backgroundApps.col.cpu')}</th>
                  <th className="px-2 py-3 font-medium">{t('backgroundApps.col.memory')}</th>
                  <th className="px-4 py-3 text-right font-medium sm:px-5">
                    {t('backgroundApps.col.action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {visibleApps.map((app) => {
                  const stopping =
                    stopProcesses.isPending &&
                    (stopProcesses.variables?.some((target) => target.pid === app.pid) ?? false)
                  const appLabel = displayName(app.name)
                  const canStop = app.safeToTerminate
                  const hasIcon = Boolean(app.iconDataUrl)
                  const cpu =
                    app.cpuPercent > 0 && app.cpuPercent <= 400 ? app.cpuPercent : null

                  return (
                    <tr
                      key={app.pid}
                      className={cn(
                        'group align-middle transition-colors hover:bg-chart-ram/[0.04]',
                        !canStop && 'bg-muted/10'
                      )}
                    >
                      <td className="px-4 py-3 sm:px-5">
                        <div className="flex items-center gap-3">
                          {hasIcon ? (
                            <img
                              src={app.iconDataUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border/60"
                              draggable={false}
                            />
                          ) : null}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {appLabel}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              PID {app.pid}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        {canStop ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-border/60">
                            <User className="h-3 w-3" aria-hidden="true" />
                            {t('backgroundApps.user')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2.5 py-0.5 text-[11px] font-medium text-warning ring-1 ring-warning/20">
                            <Shield className="h-3 w-3" aria-hidden="true" />
                            {t('backgroundApps.protected')}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-muted-foreground">
                        {cpu != null ? `${cpu.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-2 py-3 tabular-nums text-sm font-semibold text-foreground">
                        {formatBytes(app.memoryBytes)}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 rounded-lg border-border/80 bg-background/70 text-[12px] backdrop-blur-sm"
                          disabled={
                            !access.allowed ? false : !canStop || stopProcesses.isPending
                          }
                          title={
                            !canStop ? t('backgroundApps.selfProtectedHint') : undefined
                          }
                          onClick={() => {
                            if (!access.guard()) return
                            if (!canStop) return
                            void handleStop([{ pid: app.pid, name: app.name }])
                          }}
                        >
                          <Square className="h-3 w-3" aria-hidden="true" />
                          {stopping
                            ? t('backgroundApps.stopping')
                            : t('backgroundApps.stop')}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {showTeaser ? (
              <FeatureTeaserBlock feature="background_apps" maxHeightClassName="max-h-48">
                <div className="divide-y divide-border/70">
                  {teaserApps.map((app) => {
                    const appLabel = displayName(app.name)
                    return (
                      <div
                        key={`teaser-${app.pid}`}
                        className="flex items-center gap-3 px-4 py-3 sm:px-5"
                      >
                        {app.iconDataUrl ? (
                          <img
                            src={app.iconDataUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border/60"
                            draggable={false}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {appLabel}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {formatBytes(app.memoryBytes)} · PID {app.pid}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </FeatureTeaserBlock>
            ) : null}
          </div>
        )}

        <div className="relative z-10 border-t border-border/80 px-4 py-3 text-xs text-muted-foreground sm:px-5">
          {t('backgroundApps.footerHint')}
        </div>
      </div>
    </div>
  )
}

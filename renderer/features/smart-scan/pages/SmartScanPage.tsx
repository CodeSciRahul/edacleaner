import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ScanSearch,
  Sparkles,
  HardDrive,
  Zap,
  CheckCircle2,
  Loader2,
  Square
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toolbar } from '@/components/desktop/Toolbar'
import { StatusCard } from '@/components/desktop/StatusCard'
import { MetricCard } from '@/components/desktop/MetricCard'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import type { SmartScanAreaId, SmartScanResult } from '@shared/interfaces'
import {
  useCancelSmartScan,
  useRunSmartScan,
  useSmartScanProgress
} from '@/features/smart-scan/hooks/useSmartScan'
import { useSmartScanHistory } from '@/features/smart-scan/hooks/useSmartScanHistory'
import { SmartScanLoaderModal } from '@/features/smart-scan/components/SmartScanLoaderModal'
import { SmartScanHero } from '@/features/smart-scan/components/SmartScanHero'
import {
  formatScanDuration,
  smartScanAreaIcons,
  smartScanStatusStyles
} from '@/features/smart-scan/lib/scan-meta'
import {
  smartScanAreaDescKey,
  smartScanAreaLabelKey,
  smartScanStatusLabelKey
} from '@/features/smart-scan/lib/area-i18n'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'
import { useSettingsStore } from '@/store/settings-store'
import { appendSmartScanActivity } from '@/features/reports/lib/activity-history'
import { useTranslation } from '@/i18n/useTranslation'
import scanHeroBgDark from '@/assets/smart-scan/scan-hero-bg-dark.png'
import scanHeroBgLight from '@/assets/smart-scan/scan-hero-bg-light.png'

const AREA_ORDER: SmartScanAreaId[] = ['cleanup', 'storage', 'performance', 'security']

export function SmartScanPage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [result, setResult] = useState<SmartScanResult | null>(null)
  const [restoredFromHistory, setRestoredFromHistory] = useState(false)
  const [didHydrateResult, setDidHydrateResult] = useState(false)
  const restoreLastSmartScan = useSettingsStore((s) => s.restoreLastSmartScan)
  const showCompletionFeedback = useSettingsStore((s) => s.showCompletionFeedback)

  const { history, hydrated, hasHistory, persistResult } = useSmartScanHistory()
  const runScan = useRunSmartScan()
  const cancelScan = useCancelSmartScan()
  const isScanning = runScan.isPending
  const progress = useSmartScanProgress(isScanning)

  // Restore previous results once when local history is available
  useEffect(() => {
    if (!hydrated || didHydrateResult) return
    if (restoreLastSmartScan && history) {
      setResult(history.lastResult)
      setRestoredFromHistory(true)
    }
    setDidHydrateResult(true)
  }, [hydrated, history, didHydrateResult, restoreLastSmartScan])

  const scanned = Boolean(result) && !isScanning

  async function handleScan(): Promise<void> {
    setResult(null)
    setRestoredFromHistory(false)
    try {
      const next = await runScan.mutateAsync()
      persistResult(next)
      appendSmartScanActivity(next)
      setResult(next)
    } catch {
      // Soft failure — StatusCard shows a reassuring retry message
    }
  }

  async function handleCancel(): Promise<void> {
    await cancelScan.mutateAsync()
  }

  const status = useMemo(() => {
    if (isScanning) {
      return {
        icon: ScanSearch,
        status: 'good' as const,
        title: t('smartScan.status.scanningTitle'),
        message: progress?.message ?? t('smartScan.status.scanningMsg')
      }
    }
    if (runScan.isError) {
      return {
        icon: ScanSearch,
        status: 'good' as const,
        title: t('smartScan.status.pausedTitle'),
        message: t('smartScan.status.pausedMsg')
      }
    }
    if (result) {
      return {
        icon: CheckCircle2,
        status: 'good' as const,
        title: result.summaryTitle,
        message: restoredFromHistory
          ? t('smartScan.status.lastScanned', {
              message: result.summaryMessage,
              when: formatRelativeScanTime(result.scannedAt)
            })
          : result.summaryMessage
      }
    }
    return {
      icon: ScanSearch,
      status: 'good' as const,
      title: t('smartScan.status.readyTitle'),
      message: t('smartScan.status.readyMsg')
    }
  }, [isScanning, progress?.message, runScan.isError, result, restoredFromHistory, t])

  const cleanupMetric =
    result?.areas.find((a) => a.id === 'cleanup')?.metricValue ??
    formatBytes(result?.totalReclaimableBytes ?? 0)
  const duplicateMetric =
    result?.areas.find((a) => a.id === 'storage')?.metricValue ??
    formatBytes(result?.duplicateBytes ?? 0)
  const bootMetric =
    result?.areas.find((a) => a.id === 'performance')?.metricValue ??
    (result && result.estimatedBootSeconds > 0
      ? `−${result.estimatedBootSeconds} sec`
      : t('smartScan.onTrack'))

  const showEmptyState = hydrated && !hasHistory && !scanned && !isScanning && !runScan.isError

  return (
    <>
      <Toolbar
        title={t('smartScan.title')}
        description={t('smartScan.description')}
        actions={
          <div className="flex items-center gap-2">
            {isScanning ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg px-3 text-[13px]"
                onClick={() => void handleCancel()}
                disabled={cancelScan.isPending}
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                {t('common.pause')}
              </Button>
            ) : null}
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              onClick={() => void handleScan()}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ScanSearch className="h-4 w-4" aria-hidden="true" />
              )}
              {scanned || hasHistory
                ? isScanning
                  ? t('common.scanning')
                  : t('smartScan.rescan')
                : isScanning
                  ? t('common.scanning')
                  : t('smartScan.start')}
            </Button>
          </div>
        }
      />

      <SmartScanLoaderModal
        open={isScanning}
        message={progress?.message}
        percent={progress?.percent}
        currentItem={progress?.currentItem}
        areaId={progress?.areaId}
        areaOrder={AREA_ORDER}
        onCancel={() => void handleCancel()}
        cancelPending={cancelScan.isPending}
      />

      <div className="space-y-6 p-content-pad">
        {showEmptyState ? (
          <section
            aria-label={t('smartScan.emptyTitle')}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card animate-in fade-in-0 duration-300 sm:p-7"
          >
            {/* Full-card scan art — same pattern as DashboardHero / SmartScanHero */}
            <img
              src={scanHeroBgLight}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
              draggable={false}
              aria-hidden="true"
            />
            <img
              src={scanHeroBgDark}
              alt=""
              className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
              draggable={false}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
              aria-hidden="true"
            />

            <div className="relative z-10 flex min-h-[200px] max-w-md flex-col justify-center gap-5 sm:min-h-[240px] sm:max-w-lg sm:gap-6 lg:max-w-xl">
              <div className="space-y-3">
                <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t('smartScan.title')}
                </div>
                <div>
                  <h2 className="text-section-title text-foreground sm:text-2xl">
                    {t('smartScan.emptyTitle')}
                  </h2>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {t('smartScan.emptyDesc')}
                  </p>
                </div>
              </div>
              <div>
                <Button className="h-10 gap-2 rounded-lg px-4 text-[13px]" onClick={() => void handleScan()}>
                  <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  {t('smartScan.firstScan')}
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {scanned && result ? (
          <>
            {showCompletionFeedback ? <SmartScanHero result={result} /> : null}

            <StatusCard
              icon={status.icon}
              title={status.title}
              status={status.status}
              message={status.message}
            />

            <section aria-label={t('smartScan.results')}>
              <h2 className="mb-4 text-section-title text-foreground">{t('smartScan.results')}</h2>
              <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={Sparkles}
                  title={t('smartScan.reclaimable')}
                  value={cleanupMetric}
                  actionLabel={t('smartScan.goCleanup')}
                  onAction={() => navigate('/cleanup')}
                />
                <MetricCard
                  icon={HardDrive}
                  title={t('smartScan.duplicates')}
                  value={duplicateMetric}
                  actionLabel={t('smartScan.goStorage')}
                  onAction={() => navigate('/storage')}
                />
                <MetricCard
                  icon={Zap}
                  title={t('smartScan.bootImpact')}
                  value={bootMetric}
                  actionLabel={t('smartScan.goPerformance')}
                  onAction={() => navigate('/performance')}
                />
                <MetricCard
                  icon={ScanSearch}
                  title={t('smartScan.duration')}
                  value={formatScanDuration(result.durationMs)}
                />
              </div>
            </section>

            <section aria-label={t('smartScan.areas')}>
              <h2 className="mb-4 text-section-title text-foreground">{t('smartScan.areas')}</h2>
              <div className="space-y-3">
                {result.areas.map((area) => {
                  const Icon = smartScanAreaIcons[area.id]

                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => navigate(area.href)}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left',
                        'outline-none transition-all duration-150 ease-out',
                        'hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'animate-in fade-in-0 slide-in-from-bottom-1 duration-300'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                          smartScanStatusStyles[area.status]
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {t(smartScanAreaLabelKey(area.id))}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn('border-0', smartScanStatusStyles[area.status])}
                          >
                            {t(smartScanStatusLabelKey(area.status))}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t(smartScanAreaDescKey(area.id))}
                        </p>
                      </div>

                      <p className="shrink-0 text-sm font-medium text-foreground">{area.finding}</p>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        ) : null}

        {!scanned && !isScanning && runScan.isError ? (
          <StatusCard
            icon={status.icon}
            title={status.title}
            status={status.status}
            message={status.message}
          />
        ) : null}
      </div>
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ScanSearch } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { StatusCard } from '@/components/desktop/StatusCard'
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
import {
  SmartScanHero,
  type SmartScanHeroPhase
} from '@/features/smart-scan/components/SmartScanHero'
import { SmartScanMetricCard } from '@/features/smart-scan/components/SmartScanMetricCard'
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

const AREA_ORDER: SmartScanAreaId[] = ['cleanup', 'storage', 'performance', 'security']

const AREA_ACCENT: Record<
  SmartScanAreaId,
  {
    wash: string
    orb: string
    ringHover: string
  }
> = {
  cleanup: {
    wash: 'from-chart-disk/20 via-chart-disk/5 to-transparent',
    orb: 'bg-chart-disk/20',
    ringHover:
      'hover:border-chart-disk/40 hover:shadow-[0_18px_40px_-16px_rgba(139,92,246,0.35)]'
  },
  storage: {
    wash: 'from-warning/20 via-warning/5 to-transparent',
    orb: 'bg-warning/20',
    ringHover:
      'hover:border-warning/40 hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.35)]'
  },
  performance: {
    wash: 'from-primary/20 via-primary/5 to-transparent',
    orb: 'bg-primary/20',
    ringHover:
      'hover:border-primary/40 hover:shadow-[0_18px_40px_-16px_rgba(37,99,235,0.35)]'
  },
  security: {
    wash: 'from-success/20 via-success/5 to-transparent',
    orb: 'bg-success/20',
    ringHover:
      'hover:border-success/40 hover:shadow-[0_18px_40px_-16px_rgba(34,197,94,0.35)]'
  }
}

export function SmartScanPage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [result, setResult] = useState<SmartScanResult | null>(null)
  const [restoredFromHistory, setRestoredFromHistory] = useState(false)
  const [didHydrateResult, setDidHydrateResult] = useState(false)
  const restoreLastSmartScan = useSettingsStore((s) => s.restoreLastSmartScan)

  const { history, hydrated, hasHistory, persistResult } = useSmartScanHistory()
  const runScan = useRunSmartScan()
  const cancelScan = useCancelSmartScan()
  const isScanning = runScan.isPending
  const progress = useSmartScanProgress(isScanning)

  useEffect(() => {
    if (!hydrated || didHydrateResult) return
    if (restoreLastSmartScan && history) {
      setResult(history.lastResult)
      setRestoredFromHistory(true)
    }
    setDidHydrateResult(true)
  }, [hydrated, history, didHydrateResult, restoreLastSmartScan])

  // After Cleanup updates persisted history, refresh the on-screen result
  useEffect(() => {
    if (!hydrated || !restoreLastSmartScan || !history) return
    if (!didHydrateResult) return
    setResult((prev) => {
      if (!prev) return history.lastResult
      // Prefer newer patched history (cleanup progress) over stale in-memory result
      if (history.lastResult.healthScore !== prev.healthScore) return history.lastResult
      const prevCleanup = prev.areas.find((a) => a.id === 'cleanup')
      const nextCleanup = history.lastResult.areas.find((a) => a.id === 'cleanup')
      if (prevCleanup && nextCleanup && prevCleanup.status !== nextCleanup.status) {
        return history.lastResult
      }
      return prev
    })
  }, [history, hydrated, didHydrateResult, restoreLastSmartScan])

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

  const heroPhase = useMemo((): SmartScanHeroPhase => {
    if (isScanning) return 'scanning'
    if (scanned && result) return 'complete'
    if (hydrated && !hasHistory) return 'empty'
    return 'idle'
  }, [isScanning, scanned, result, hydrated, hasHistory])

  const status = useMemo(() => {
    if (runScan.isError) {
      return {
        icon: ScanSearch,
        status: 'good' as const,
        title: t('smartScan.status.pausedTitle'),
        message: t('smartScan.status.pausedMsg')
      }
    }
    if (result && restoredFromHistory) {
      return {
        icon: ScanSearch,
        status: 'good' as const,
        title: result.summaryTitle,
        message: t('smartScan.status.lastScanned', {
          message: result.summaryMessage,
          when: formatRelativeScanTime(result.scannedAt)
        })
      }
    }
    return null
  }, [runScan.isError, result, restoredFromHistory, t])

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

  return (
    <>
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
        <SmartScanHero
          phase={heroPhase}
          result={result}
          isScanning={isScanning}
          cancelPending={cancelScan.isPending}
          progressMessage={progress?.message}
          progressPercent={progress?.percent ?? null}
          onScan={() => void handleScan()}
          onCancel={() => void handleCancel()}
        />

        {status ? (
          <StatusCard
            icon={status.icon}
            title={status.title}
            status={status.status}
            message={status.message}
          />
        ) : null}

        {scanned && result ? (
          <>
            <section aria-label={t('smartScan.results')}>
              <div className="mb-4">
                <h2 className="text-section-title text-foreground">{t('smartScan.results')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('smartScan.areasHint')}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SmartScanMetricCard
                  metricId="reclaimable"
                  title={t('smartScan.reclaimable')}
                  value={cleanupMetric}
                  actionLabel={t('smartScan.goCleanup')}
                  onAction={() => navigate('/cleanup')}
                />
                <SmartScanMetricCard
                  metricId="duplicates"
                  title={t('smartScan.duplicates')}
                  value={duplicateMetric}
                  actionLabel={t('smartScan.goStorage')}
                  onAction={() => navigate('/storage')}
                />
                <SmartScanMetricCard
                  metricId="boot"
                  title={t('smartScan.bootImpact')}
                  value={bootMetric}
                  actionLabel={t('smartScan.goPerformance')}
                  onAction={() => navigate('/performance')}
                />
                <SmartScanMetricCard
                  metricId="duration"
                  title={t('smartScan.duration')}
                  value={formatScanDuration(result.durationMs)}
                  actionLabel={t('smartScan.goReports')}
                  onAction={() => navigate('/reports')}
                />
              </div>
            </section>

            <section aria-label={t('smartScan.areas')} className="space-y-4">
              <div>
                <h2 className="text-section-title text-foreground">{t('smartScan.areas')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('smartScan.areasHint')}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {result.areas.map((area) => {
                  const Icon = smartScanAreaIcons[area.id]
                  const accent = AREA_ACCENT[area.id]

                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => navigate(area.href)}
                      className={cn(
                        'group relative flex overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-card',
                        'outline-none transition-all duration-200 ease-out hover:-translate-y-1',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'animate-in fade-in-0 slide-in-from-bottom-1 duration-300',
                        accent.ringHover
                      )}
                    >
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b',
                          accent.wash
                        )}
                        aria-hidden="true"
                      />
                      <div
                        className={cn(
                          'pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full blur-2xl opacity-70',
                          'transition-opacity duration-200 group-hover:opacity-100',
                          accent.orb
                        )}
                        aria-hidden="true"
                      />

                      <div className="relative z-10 flex w-full items-start gap-3">
                        <div
                          className={cn(
                            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm',
                            smartScanStatusStyles[area.status]
                          )}
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {t(smartScanAreaLabelKey(area.id))}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                'border-0 text-[10px]',
                                smartScanStatusStyles[area.status]
                              )}
                            >
                              {t(smartScanStatusLabelKey(area.status))}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {t(smartScanAreaDescKey(area.id))}
                          </p>
                          <p className="mt-2 text-sm font-medium text-foreground">{area.finding}</p>
                        </div>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </>
  )
}

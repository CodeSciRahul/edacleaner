import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanSearch, CheckCircle2 } from 'lucide-react'
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

  const showStatusCard = scanned || isScanning || runScan.isError

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

      <div className="space-y-5 p-content-pad">
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

        {showStatusCard ? (
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

            <section aria-label={t('smartScan.areas')} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t('smartScan.areas')}</h2>
              <div className="space-y-2">
                {result.areas.map((area) => {
                  const Icon = smartScanAreaIcons[area.id]

                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => navigate(area.href)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left',
                        'outline-none transition-all duration-150 ease-out',
                        'hover:border-primary/30 hover:bg-accent/30 hover:shadow-sm',
                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'animate-in fade-in-0 slide-in-from-bottom-1 duration-300'
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          smartScanStatusStyles[area.status]
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {t(smartScanAreaLabelKey(area.id))}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn('border-0 text-[10px]', smartScanStatusStyles[area.status])}
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
      </div>
    </>
  )
}

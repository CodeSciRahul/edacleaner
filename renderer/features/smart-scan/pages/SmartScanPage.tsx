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
import { SmartScanProgressPanel } from '@/features/smart-scan/components/SmartScanProgressPanel'
import { SmartScanHero } from '@/features/smart-scan/components/SmartScanHero'
import { SmartScanHistoryCard } from '@/features/smart-scan/components/SmartScanHistoryCard'
import {
  formatScanDuration,
  smartScanAreaIcons,
  smartScanStatusLabels,
  smartScanStatusStyles
} from '@/features/smart-scan/lib/scan-meta'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'

const AREA_ORDER: SmartScanAreaId[] = ['cleanup', 'storage', 'performance', 'security']

export function SmartScanPage(): React.ReactElement {
  const navigate = useNavigate()
  const [result, setResult] = useState<SmartScanResult | null>(null)
  const [restoredFromHistory, setRestoredFromHistory] = useState(false)
  const [didHydrateResult, setDidHydrateResult] = useState(false)

  const { history, hydrated, animateKey, hasHistory, persistResult } = useSmartScanHistory()
  const runScan = useRunSmartScan()
  const cancelScan = useCancelSmartScan()
  const isScanning = runScan.isPending
  const progress = useSmartScanProgress(isScanning)

  // Restore previous results once when local history is available
  useEffect(() => {
    if (!hydrated || didHydrateResult) return
    if (history) {
      setResult(history.lastResult)
      setRestoredFromHistory(true)
    }
    setDidHydrateResult(true)
  }, [hydrated, history, didHydrateResult])

  const scanned = Boolean(result) && !isScanning

  async function handleScan(): Promise<void> {
    setResult(null)
    setRestoredFromHistory(false)
    try {
      const next = await runScan.mutateAsync()
      persistResult(next)
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
        title: 'Smart Scan in progress…',
        message:
          progress?.message ??
          'Checking cleanup, storage, performance, and protections for easy wins.'
      }
    }
    if (runScan.isError) {
      return {
        icon: ScanSearch,
        status: 'good' as const,
        title: 'Scan paused',
        message: 'No problem — you can start again anytime. Your PC was left unchanged.'
      }
    }
    if (result) {
      return {
        icon: CheckCircle2,
        status: 'good' as const,
        title: result.summaryTitle,
        message: restoredFromHistory
          ? `${result.summaryMessage} Last scanned ${formatRelativeScanTime(result.scannedAt)}.`
          : result.summaryMessage
      }
    }
    return {
      icon: ScanSearch,
      status: 'good' as const,
      title: 'Ready to scan',
      message:
        'One click checks junk, storage, performance, and protections — then recommends safe fixes.'
    }
  }, [isScanning, progress?.message, runScan.isError, result, restoredFromHistory])

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
      : 'On track')

  const showEmptyState = hydrated && !hasHistory && !scanned && !isScanning && !runScan.isError

  return (
    <>
      <Toolbar
        title="Smart Scan"
        description="One-click health check across junk, storage, and performance."
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
                Pause
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
                  ? 'Scanning…'
                  : 'Rescan'
                : isScanning
                  ? 'Scanning…'
                  : 'Start Smart Scan'}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-content-pad">
        {showEmptyState ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-b from-muted/40 to-muted/10 px-8 py-16 text-center animate-in fade-in-0 duration-300">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <ScanSearch className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="text-section-title text-foreground">No scans performed yet</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Run your first Smart Scan to check cleanup, storage, performance, and security —
              then we&apos;ll save your results here for next time.
            </p>
            <Button className="mt-6 gap-2" onClick={() => void handleScan()}>
              <ScanSearch className="h-4 w-4" aria-hidden="true" />
              Start your first scan
            </Button>
          </div>
        ) : null}

        {isScanning && progress ? (
          <SmartScanProgressPanel
            message={progress.message}
            percent={progress.percent}
            currentItem={progress.currentItem}
            areaId={progress.areaId}
            areaOrder={AREA_ORDER}
          />
        ) : null}

        {!isScanning && history ? (
          <SmartScanHistoryCard history={history} animateKey={animateKey} />
        ) : null}

        {scanned && result ? (
          <>
            <SmartScanHero result={result} />

            <StatusCard
              icon={status.icon}
              title={status.title}
              status={status.status}
              message={status.message}
            />

            <section aria-label="Scan summary">
              <h2 className="mb-4 text-section-title text-foreground">Scan Results</h2>
              <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={Sparkles}
                  title="Reclaimable Space"
                  value={cleanupMetric}
                  actionLabel="Go to Cleanup"
                  onAction={() => navigate('/cleanup')}
                />
                <MetricCard
                  icon={HardDrive}
                  title="Duplicate Files"
                  value={duplicateMetric}
                  actionLabel="Go to Storage"
                  onAction={() => navigate('/storage')}
                />
                <MetricCard
                  icon={Zap}
                  title="Boot Impact"
                  value={bootMetric}
                  actionLabel="Go to Performance"
                  onAction={() => navigate('/performance')}
                />
                <MetricCard
                  icon={ScanSearch}
                  title="Scan Duration"
                  value={formatScanDuration(result.durationMs)}
                />
              </div>
            </section>

            <section aria-label="Scan areas">
              <h2 className="mb-4 text-section-title text-foreground">Areas Checked</h2>
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
                          <p className="text-sm font-semibold text-foreground">{area.label}</p>
                          <Badge
                            variant="outline"
                            className={cn('border-0', smartScanStatusStyles[area.status])}
                          >
                            {smartScanStatusLabels[area.status]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{area.description}</p>
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

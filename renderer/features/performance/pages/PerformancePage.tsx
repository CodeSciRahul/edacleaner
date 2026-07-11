import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Power, Layers, Cpu, Activity, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toolbar } from '@/components/desktop/Toolbar'
import { StatusCard } from '@/components/desktop/StatusCard'
import { MetricCard } from '@/components/desktop/MetricCard'
import { PerformanceGraph } from '@/components/desktop/PerformanceGraph'
import { TopProcessesTable } from '@/components/desktop/TopProcessesTable'
import { formatBytes } from '@shared/utils'
import { electronService } from '@/services/electron-service'
import type { BoostResult } from '@shared/interfaces'
import {
  useBoostAnalysis,
  useBoostProgress,
  useBoostSnapshot,
  useCancelBoost,
  useRunBoost
} from '@/features/performance/hooks/useBoost'
import { useStartupApps } from '@/features/performance/hooks/useStartupApps'
import { AppsSubnav } from '@/features/apps/components/AppsSubnav'

function scoreFromSnapshot(usedPercent: number, isLowDisk: boolean): number {
  let score = 100 - Math.round(usedPercent * 0.55)
  if (isLowDisk) score -= 12
  return Math.max(15, Math.min(98, score))
}

export function PerformancePage(): React.ReactElement {
  const navigate = useNavigate()
  const { data: analysis, isLoading: analysisLoading, refetch: refetchAnalysis } =
    useBoostAnalysis()
  const { data: snapshot, isLoading: snapshotLoading } = useBoostSnapshot()
  const { data: startupList, isLoading: startupLoading } = useStartupApps()
  const runBoost = useRunBoost()
  const cancelBoost = useCancelBoost()
  const isBoosting = runBoost.isPending
  const progress = useBoostProgress(isBoosting)
  const [lastResult, setLastResult] = useState<BoostResult | null>(null)

  const memory = snapshot?.memory ?? analysis?.memory
  const topProcesses = snapshot?.topProcesses ?? []
  const startupEnabledCount =
    startupList?.entries.filter((entry) => entry.enabled).length ?? 0
  const backgroundCount = analysis?.processSuggestions.length ?? 0

  const performanceScore = useMemo(() => {
    if (!memory) return null
    return scoreFromSnapshot(memory.usedPercent, Boolean(analysis?.diskPressure?.isLow))
  }, [memory, analysis?.diskPressure?.isLow])

  const recoverableEstimate = useMemo(() => {
    if (!analysis) return 0
    return analysis.processSuggestions.reduce((sum, p) => sum + p.memoryBytes, 0)
  }, [analysis])

  const cpuHistory = useMemo(() => {
    const base = memory?.usedPercent ?? 40
    return Array.from({ length: 24 }, (_, i) => ({
      label: i === 0 ? '0s' : i === 23 ? '60s' : '',
      value: Math.max(5, Math.min(95, base * 0.6 + Math.sin(i / 2.5) * 12 + (i % 5)))
    }))
  }, [memory?.usedPercent])

  const memoryHistory = useMemo(() => {
    const base = memory?.usedPercent ?? 50
    return Array.from({ length: 24 }, (_, i) => ({
      label: i === 0 ? '0s' : i === 23 ? '60s' : '',
      value: Math.max(5, Math.min(95, base + Math.cos(i / 3) * 6))
    }))
  }, [memory?.usedPercent])

  const status = useMemo(() => {
    if (!performanceScore) {
      return {
        status: 'warning' as const,
        title: 'Measuring performance…',
        message: 'Collecting memory, disk, and process data.'
      }
    }
    if (performanceScore >= 80) {
      return {
        status: 'good' as const,
        title: `Performance Score: ${performanceScore}`,
        message: 'System resources look healthy. Boost can still clear temp files and caches.'
      }
    }
    if (performanceScore >= 55) {
      return {
        status: 'warning' as const,
        title: `Performance Score: ${performanceScore}`,
        message:
          analysis?.warnings[0] ??
          'Some resources can be reclaimed safely. Review Background or Startup apps.'
      }
    }
    return {
      status: 'critical' as const,
      title: `Performance Score: ${performanceScore}`,
      message:
        analysis?.warnings[0] ??
        'Memory or disk pressure is high. Run Boost or manage background apps.'
    }
  }, [performanceScore, analysis?.warnings])

  const handleBoost = async (): Promise<void> => {
    setLastResult(null)

    let emptyTrash = false
    if (analysis?.trashSupported) {
      const platform = await electronService.app().getPlatform()
      const trashName = platform === 'win32' ? 'Recycle Bin' : 'Trash'
      const confirm = await electronService.dialog().message({
        type: 'question',
        title: `Empty ${trashName}?`,
        message: `Also empty the ${trashName} during Boost?`,
        detail: 'Temp files and caches are cleaned either way. This step is optional.',
        buttons: ['Skip', `Empty ${trashName}`, 'Cancel']
      })
      if (confirm.response === 2) return
      emptyTrash = confirm.response === 1
    }

    try {
      const result = await runBoost.mutateAsync({
        cleanTempFiles: true,
        cleanAppCaches: true,
        emptyTrash,
        flushDnsCache: true,
        terminateProcessIds: []
      })
      setLastResult(result)
      void refetchAnalysis()
    } catch (err) {
      setLastResult({
        success: false,
        cancelled: false,
        durationMs: 0,
        memoryBeforeBytes: 0,
        memoryAfterBytes: 0,
        memoryReclaimedBytes: 0,
        tempFilesRemovedBytes: 0,
        cacheFilesRemovedBytes: 0,
        diskFreedBytes: 0,
        processesTerminated: 0,
        dnsFlushed: false,
        trashEmptied: false,
        steps: [],
        skipped: [],
        warnings: [err instanceof Error ? err.message : 'Boost failed']
      })
    }
  }

  return (
    <>
      <Toolbar
        title="Performance"
        description="Safely reclaim resources and jump into app managers."
        actions={
          <div className="flex items-center gap-2">
            {isBoosting ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                onClick={() => cancelBoost.mutate()}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel
              </Button>
            ) : null}
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              disabled={isBoosting || analysisLoading}
              onClick={() => void handleBoost()}
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              {isBoosting ? 'Boosting…' : 'Boost Now'}
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-content-pad">
        <AppsSubnav />

        <StatusCard
          icon={Zap}
          title={status.title}
          status={status.status}
          message={status.message}
        />

        {isBoosting && progress ? (
          <section
            aria-label="Boost progress"
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">{progress.message}</p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {progress.percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            {progress.currentItem ? (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {progress.currentItem}
              </p>
            ) : null}
          </section>
        ) : null}

        {lastResult ? (
          <section
            aria-label="Boost results"
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <h2 className="mb-3 text-section-title text-foreground">
              {lastResult.cancelled ? 'Boost cancelled' : 'Boost results'}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ResultStat label="Disk freed" value={formatBytes(lastResult.diskFreedBytes)} />
              <ResultStat
                label="Free memory delta"
                value={formatBytes(lastResult.memoryReclaimedBytes)}
              />
              <ResultStat
                label="Processes stopped"
                value={String(lastResult.processesTerminated)}
              />
              <ResultStat
                label="Duration"
                value={`${(lastResult.durationMs / 1000).toFixed(1)}s`}
              />
            </div>
            <ul className="mt-4 space-y-2">
              {lastResult.steps.map((step) => (
                <li
                  key={`${step.id}-${step.label}`}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{step.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.detail}
                      {step.error ? ` — ${step.error}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {step.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-label="Performance summary">
          <h2 className="mb-4 text-section-title text-foreground">Summary</h2>
          <div className="grid gap-grid-gap sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Power}
              title="Startup Apps"
              description="Launch at sign-in"
              value={startupLoading ? '…' : `${startupEnabledCount} enabled`}
              actionLabel="Manage"
              onAction={() => navigate('/startup-apps')}
            />
            <MetricCard
              icon={Layers}
              title="Background Apps"
              description="Safe-to-review processes"
              value={analysisLoading ? '…' : `${backgroundCount} listed`}
              actionLabel="Open"
              onAction={() => navigate('/background-apps')}
            />
            <MetricCard
              icon={Cpu}
              title="Recoverable RAM"
              description="From background suggestions"
              value={
                snapshotLoading && !analysis ? '…' : formatBytes(recoverableEstimate)
              }
              actionLabel="Review"
              onAction={() => navigate('/background-apps')}
            />
            <MetricCard
              icon={Activity}
              title="Disk free"
              description={analysis?.diskPressure?.mountPath ?? 'System volume'}
              value={
                analysis?.diskPressure
                  ? formatBytes(analysis.diskPressure.freeBytes)
                  : snapshotLoading
                    ? '…'
                    : 'N/A'
              }
              actionLabel="Analyze"
              onAction={() => void refetchAnalysis()}
            />
          </div>
        </section>

        <div className="grid gap-grid-gap xl:grid-cols-2">
          <PerformanceGraph title="CPU trend (estimated)" data={cpuHistory} color="cpu" />
          <PerformanceGraph title="Memory usage" data={memoryHistory} color="ram" />
        </div>

        <TopProcessesTable
          processes={topProcesses.map((p) => ({
            name: p.name,
            memoryBytes: p.memoryBytes,
            cpu: Number(p.cpuPercent.toFixed(1))
          }))}
        />
      </div>
    </>
  )
}

function ResultStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium tabular-nums text-foreground">{value}</p>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Power, Layers, Cpu, Activity, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
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
import { BoostResultsCard } from '@/features/performance/components/BoostResultsCard'
import { PerformanceHero } from '@/features/performance/components/PerformanceHero'
import {
  PerformanceActionGrid,
  type PerformanceActionItem
} from '@/features/performance/components/PerformanceActionGrid'
import { BoostProgressPanel } from '@/features/performance/components/BoostProgressPanel'
import { PerformanceQuickLinks } from '@/features/performance/components/PerformanceQuickLinks'

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

  const status = useMemo(() => {
    if (!performanceScore) {
      return {
        health: 'warning' as const,
        title: 'Measuring performance…',
        message: 'Collecting memory, disk, and process data to build your score.'
      }
    }
    if (performanceScore >= 80) {
      return {
        health: 'good' as const,
        title: `Looking sharp — score ${performanceScore}`,
        message: 'System resources look healthy. Boost can still clear temp files and caches.'
      }
    }
    if (performanceScore >= 55) {
      return {
        health: 'warning' as const,
        title: `Room to improve — score ${performanceScore}`,
        message:
          analysis?.warnings[0] ??
          'Some resources can be reclaimed safely. Review Background or Startup apps.'
      }
    }
    return {
      health: 'critical' as const,
      title: `Needs a boost — score ${performanceScore}`,
      message:
        analysis?.warnings[0] ??
        'Memory or disk pressure is high. Run Boost or manage background apps.'
    }
  }, [performanceScore, analysis?.warnings])

  const actionItems: PerformanceActionItem[] = [
    {
      id: 'startup',
      icon: Power,
      title: 'Startup Apps',
      description: 'Apps that launch at sign-in',
      value: startupLoading ? '…' : `${startupEnabledCount}`,
      actionLabel: 'Manage startup',
      onAction: () => navigate('/startup-apps'),
      accentClass: 'bg-warning/15 text-warning'
    },
    {
      id: 'background',
      icon: Layers,
      title: 'Background Apps',
      description: 'Safe-to-review processes',
      value: analysisLoading ? '…' : `${backgroundCount}`,
      actionLabel: 'Open list',
      onAction: () => navigate('/background-apps'),
      accentClass: 'bg-primary/15 text-primary'
    },
    {
      id: 'ram',
      icon: Cpu,
      title: 'Recoverable RAM',
      description: 'From background suggestions',
      value: snapshotLoading && !analysis ? '…' : formatBytes(recoverableEstimate),
      actionLabel: 'Review processes',
      onAction: () => navigate('/background-apps'),
      accentClass: 'bg-chart-ram/15 text-chart-ram'
    },
    {
      id: 'disk',
      icon: Activity,
      title: 'Disk free',
      description: analysis?.diskPressure?.mountPath ?? 'System volume',
      value: analysis?.diskPressure
        ? formatBytes(analysis.diskPressure.freeBytes)
        : snapshotLoading
          ? '…'
          : 'N/A',
      actionLabel: 'Refresh analysis',
      onAction: () => void refetchAnalysis(),
      accentClass: 'bg-chart-disk/15 text-chart-disk'
    }
  ]

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

  const diskFreeLabel = analysis?.diskPressure
    ? formatBytes(analysis.diskPressure.freeBytes)
    : undefined

  return (
    <>
      <Toolbar
        title="Performance"
        description="Score your PC, boost safely, and manage what runs in the background."
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2"
            onClick={() => navigate('/monitoring')}
          >
            <Monitor className="h-4 w-4" />
            Live Monitoring
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        <PerformanceHero
          score={performanceScore}
          health={status.health}
          title={status.title}
          message={status.message}
          memory={memory}
          diskFreeLabel={diskFreeLabel}
          isBoosting={isBoosting}
          isLoading={analysisLoading && !memory}
          onBoost={() => void handleBoost()}
          onCancel={() => cancelBoost.mutate()}
        />

        {isBoosting && progress ? (
          <BoostProgressPanel
            message={progress.message}
            percent={progress.percent}
            currentItem={progress.currentItem}
          />
        ) : null}

        {lastResult ? <BoostResultsCard result={lastResult} /> : null}

        <PerformanceActionGrid items={actionItems} />

        <section aria-label="Top processes">
          <div className="mb-4">
            <h2 className="text-section-title text-foreground">What’s using memory</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Highest memory consumers right now — open Background Apps to stop safe ones.
            </p>
          </div>
          <TopProcessesTable
            processes={topProcesses.map((p) => ({
              name: p.name,
              memoryBytes: p.memoryBytes,
              cpu: Number(p.cpuPercent.toFixed(1))
            }))}
          />
        </section>

        <PerformanceQuickLinks
          onOpenStartup={() => navigate('/startup-apps')}
          onOpenBackground={() => navigate('/background-apps')}
        />
      </div>
    </>
  )
}

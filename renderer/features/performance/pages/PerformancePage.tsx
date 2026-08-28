import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Power, Layers, Cpu, Activity } from 'lucide-react'
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
import { PerformanceBoostLoaderModal } from '@/features/performance/components/PerformanceBoostLoaderModal'
import { PerformanceQuickLinks } from '@/features/performance/components/PerformanceQuickLinks'
import { useTranslation } from '@/i18n/useTranslation'
import { appendBoostActivity } from '@/features/reports/lib/activity-history'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { FeatureLockedCallout } from '@/features/entitlements/components/FeatureLockedCallout'

function scoreFromSnapshot(usedPercent: number, isLowDisk: boolean): number {
  let score = 100 - Math.round(usedPercent * 0.55)
  if (isLowDisk) score -= 12
  return Math.max(15, Math.min(98, score))
}

export function PerformancePage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const boostAccess = useFeatureAccess('performance_boost')
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
        title: t('performance.measuringTitle'),
        message: t('performance.measuringMsg')
      }
    }
    if (performanceScore >= 80) {
      return {
        health: 'good' as const,
        title: t('performance.sharpTitle', { score: performanceScore }),
        message: t('performance.sharpMsg')
      }
    }
    if (performanceScore >= 55) {
      return {
        health: 'warning' as const,
        title: t('performance.improveTitle', { score: performanceScore }),
        message: analysis?.warnings[0] ?? t('performance.improveMsg')
      }
    }
    return {
      health: 'critical' as const,
      title: t('performance.needsTitle', { score: performanceScore }),
      message: analysis?.warnings[0] ?? t('performance.needsMsg')
    }
  }, [performanceScore, analysis?.warnings, t])

  const actionItems: PerformanceActionItem[] = [
    {
      id: 'startup',
      icon: Power,
      title: t('performance.startupTitle'),
      description: t('performance.startupDesc'),
      value: startupLoading ? '…' : `${startupEnabledCount}`,
      actionLabel: t('performance.startupAction'),
      onAction: () => navigate('/startup-apps'),
      accentClass: 'bg-warning/15 text-warning'
    },
    {
      id: 'background',
      icon: Layers,
      title: t('performance.bgTitle'),
      description: t('performance.bgDesc'),
      value: analysisLoading ? '…' : `${backgroundCount}`,
      actionLabel: t('performance.bgAction'),
      onAction: () => navigate('/background-apps'),
      accentClass: 'bg-primary/15 text-primary'
    },
    {
      id: 'ram',
      icon: Cpu,
      title: t('performance.ramTitle'),
      description: t('performance.ramDesc'),
      value: snapshotLoading && !analysis ? '…' : formatBytes(recoverableEstimate),
      actionLabel: t('performance.bgAction'),
      onAction: () => navigate('/background-apps'),
      accentClass: 'bg-chart-ram/15 text-chart-ram'
    },
    {
      id: 'disk',
      icon: Activity,
      title: t('performance.diskTitle'),
      description: analysis?.diskPressure?.mountPath ?? t('performance.diskDesc'),
      value: analysis?.diskPressure
        ? formatBytes(analysis.diskPressure.freeBytes)
        : snapshotLoading
          ? '…'
          : 'N/A',
      actionLabel: t('common.refresh'),
      onAction: () => void refetchAnalysis(),
      accentClass: 'bg-chart-disk/15 text-chart-disk'
    }
  ]

  const handleBoost = async (): Promise<void> => {
    if (!boostAccess.guard()) return
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
      if (!result.cancelled) {
        appendBoostActivity(result)
      }
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
      <div className="space-y-6 p-content-pad">
        <FeatureLockedCallout feature="performance_boost" />
        <PerformanceHero
          score={performanceScore}
          health={status.health}
          title={status.title}
          message={status.message}
          memory={memory}
          diskFreeLabel={diskFreeLabel}
          isBoosting={isBoosting}
          isLoading={analysisLoading && !memory}
          boostLocked={!boostAccess.allowed}
          onBoost={() => void handleBoost()}
          onCancel={() => cancelBoost.mutate()}
          onOpenMonitoring={() => navigate('/monitoring')}
        />

        <PerformanceBoostLoaderModal
          open={isBoosting}
          message={progress?.message}
          percent={progress?.percent}
          currentItem={progress?.currentItem}
          onCancel={() => cancelBoost.mutate()}
          cancelPending={cancelBoost.isPending}
        />

        {lastResult ? <BoostResultsCard result={lastResult} /> : null}

        <PerformanceActionGrid items={actionItems} />

        <section aria-label={t('performance.memorySection')}>
          <div className="mb-4">
            <h2 className="text-section-title text-foreground">
              {t('performance.memorySection')}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('performance.memoryHint')}
            </p>
          </div>
          <TopProcessesTable
            processes={topProcesses.map((p) => ({
              name: p.name,
              memoryBytes: p.memoryBytes,
              cpu: Number(p.cpuPercent.toFixed(1))
            }))}
            previewCount={4}
            locked={!boostAccess.allowed}
            lockFeature="performance_boost"
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

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Power, Layers } from 'lucide-react'
import { TopProcessesTable } from '@/components/desktop/TopProcessesTable'
import { computePerformanceScore } from '@shared/utils'
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
import { PerformancePremiumUpsell } from '@/features/performance/components/PerformancePremiumUpsell'

/** Hold post-boost display score so live RAM jitter does not erase the win. */
const BOOST_SCORE_HOLD_MS = 5 * 60 * 1000
const AUTO_STOP_PROCESS_LIMIT = 5

interface BoostScoreHold {
  score: number
  delta: number
  until: number
}

function emptyBoostResult(partial?: Partial<BoostResult>): BoostResult {
  return {
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
    scoreBefore: 0,
    scoreAfter: 0,
    scoreDelta: 0,
    steps: [],
    skipped: [],
    warnings: [],
    ...partial
  }
}

export function PerformancePage(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const boostAccess = useFeatureAccess('performance_boost')
  const { data: analysis, isLoading: analysisLoading, refetch: refetchAnalysis } =
    useBoostAnalysis(boostAccess.allowed)
  const { data: snapshot } = useBoostSnapshot(boostAccess.allowed)
  const { data: startupList, isLoading: startupLoading } = useStartupApps(boostAccess.allowed)
  const runBoost = useRunBoost()
  const cancelBoost = useCancelBoost()
  const isBoosting = runBoost.isPending
  const progress = useBoostProgress(isBoosting)
  const [lastResult, setLastResult] = useState<BoostResult | null>(null)
  const [boostHold, setBoostHold] = useState<BoostScoreHold | null>(null)
  const [holdTick, setHoldTick] = useState(0)
  /** One-shot count-up from this value after a successful Boost. */
  const [animateFromScore, setAnimateFromScore] = useState<number | null>(null)

  const memory = snapshot?.memory ?? analysis?.memory
  const topProcesses = snapshot?.topProcesses ?? []
  const startupEnabledCount =
    startupList?.entries.filter((entry) => entry.enabled).length ?? 0
  const backgroundCount = analysis?.processSuggestions.length ?? 0

  const liveScore = useMemo(() => {
    if (!memory) return null
    const suggestions = analysis?.processSuggestions ?? []
    const backgroundPressureBytes = suggestions.reduce((sum, p) => sum + p.memoryBytes, 0)
    const junkBytes =
      (analysis?.estimatedTempBytes ?? 0) + (analysis?.estimatedCacheBytes ?? 0)
    const disk = analysis?.diskPressure ?? snapshot?.diskPressure ?? null

    return computePerformanceScore({
      memoryUsedPercent: memory.usedPercent,
      diskUsedPercent: disk?.usedPercent ?? null,
      isLowDisk: Boolean(disk?.isLow),
      junkBytes,
      backgroundPressureBytes,
      backgroundProcessCount: suggestions.length
    })
  }, [memory, analysis, snapshot?.diskPressure])

  useEffect(() => {
    if (!boostHold) return
    const remaining = boostHold.until - Date.now()
    if (remaining <= 0) {
      setBoostHold(null)
      return
    }
    const timer = window.setTimeout(() => {
      setBoostHold(null)
      setHoldTick((n) => n + 1)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [boostHold, holdTick])

  const performanceScore = useMemo(() => {
    if (liveScore == null) return null
    if (boostHold && Date.now() < boostHold.until) {
      return Math.max(liveScore, boostHold.score)
    }
    return liveScore
  }, [liveScore, boostHold, holdTick])

  const scoreDelta =
    boostHold && Date.now() < boostHold.until && boostHold.delta > 0
      ? boostHold.delta
      : lastResult && !lastResult.cancelled && lastResult.scoreDelta > 0
        ? lastResult.scoreDelta
        : null

  const recoverableEstimate = useMemo(() => {
    if (!analysis) return 0
    return analysis.processSuggestions.reduce((sum, p) => sum + p.memoryBytes, 0)
  }, [analysis])

  const status = useMemo(() => {
    if (!boostAccess.allowed) {
      return {
        health: 'warning' as const,
        title: t('performance.hero.lockedTitle'),
        message: t('performance.hero.lockedMsg')
      }
    }
    if (!performanceScore) {
      return {
        health: 'warning' as const,
        title: t('performance.measuringTitle'),
        message: t('performance.measuringMsg')
      }
    }
    if (boostHold && Date.now() < boostHold.until && boostHold.delta > 0) {
      return {
        health: 'good' as const,
        title: t('performance.boostedTitle', { score: performanceScore }),
        message: t('performance.boostedMsg', { delta: boostHold.delta })
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
  }, [boostAccess.allowed, performanceScore, analysis?.warnings, boostHold, t])

  const actionItems: PerformanceActionItem[] = [
    {
      id: 'startup',
      icon: Power,
      title: t('performance.startupTitle'),
      description: t('performance.startupDesc'),
      value: startupLoading ? '…' : `${startupEnabledCount}`,
      actionLabel: t('performance.startupAction'),
      onAction: () => navigate('/startup-apps'),
      accent: 'startup'
    },
    {
      id: 'background',
      icon: Layers,
      title: t('performance.bgTitle'),
      description: t('performance.bgDesc'),
      value: analysisLoading ? '…' : `${backgroundCount}`,
      actionLabel: t('performance.bgAction'),
      onAction: () => navigate('/background-apps'),
      accent: 'background'
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

    let terminateProcessIds: number[] = []
    const suggestions = analysis?.processSuggestions ?? []
    if (suggestions.length > 0) {
      const top = suggestions.slice(0, AUTO_STOP_PROCESS_LIMIT)
      const names = top
        .map((p) => p.name)
        .slice(0, 3)
        .join(', ')
      const more = top.length > 3 ? ` (+${top.length - 3} more)` : ''
      const confirmApps = await electronService.dialog().message({
        type: 'question',
        title: 'Stop background apps?',
        message: `Also stop ${top.length} suggested background app(s) during Boost?`,
        detail: `${names}${more}\n\nUnsaved work in those apps may be lost. You can skip and still clean temps/caches.`,
        buttons: ['Skip', 'Stop apps', 'Cancel']
      })
      if (confirmApps.response === 2) return
      if (confirmApps.response === 1) {
        terminateProcessIds = top.map((p) => p.pid)
      }
    }

    try {
      const result = await runBoost.mutateAsync({
        cleanTempFiles: true,
        cleanAppCaches: true,
        emptyTrash,
        flushDnsCache: true,
        terminateProcessIds
      })
      setLastResult(result)
      if (!result.cancelled) {
        appendBoostActivity(result)
        if (result.scoreDelta > 0 || result.success) {
          setAnimateFromScore(result.scoreBefore)
          setBoostHold({
            score: result.scoreAfter,
            delta: result.scoreDelta,
            until: Date.now() + BOOST_SCORE_HOLD_MS
          })
          window.setTimeout(() => setAnimateFromScore(null), 1500)
        }
      }
      void refetchAnalysis()
    } catch (err) {
      setLastResult(
        emptyBoostResult({
          warnings: [err instanceof Error ? err.message : 'Boost failed']
        })
      )
    }
  }

  return (
    <>
      <div className="space-y-6 p-content-pad">
        <PerformanceHero
          score={boostAccess.allowed ? performanceScore : null}
          scoreDelta={boostAccess.allowed ? scoreDelta : null}
          animateFromScore={boostAccess.allowed ? animateFromScore : null}
          health={status.health}
          title={status.title}
          message={status.message}
          memory={boostAccess.allowed ? memory : undefined}
          startupCount={
            boostAccess.allowed ? (startupLoading ? null : startupEnabledCount) : null
          }
          recoverableBytes={boostAccess.allowed ? recoverableEstimate : 0}
          isBoosting={isBoosting}
          isLoading={boostAccess.allowed && analysisLoading && !memory}
          boostLocked={!boostAccess.allowed}
          onBoost={() => void handleBoost()}
          onCancel={() => cancelBoost.mutate()}
          onOpenStartup={() => navigate('/startup-apps')}
        />

        {!boostAccess.allowed ? (
          <PerformancePremiumUpsell feature="performance_boost" />
        ) : (
          <>
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
                  cpu: Number(p.cpuPercent.toFixed(1)),
                  iconDataUrl: p.iconDataUrl
                }))}
                previewCount={4}
                locked={false}
                lockFeature="performance_boost"
              />
            </section>

            <PerformanceQuickLinks
              onOpenStartup={() => navigate('/startup-apps')}
              onOpenBackground={() => navigate('/background-apps')}
            />
          </>
        )}
      </div>
    </>
  )
}

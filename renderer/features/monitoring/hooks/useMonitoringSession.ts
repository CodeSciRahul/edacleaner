import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { electronService } from '@/services/electron-service'
import type { SystemMetricsSample } from '@shared/interfaces'
import type {
  ChartPoint,
  HealthStatus,
  MetricId,
  MetricStats,
  TimeRangeId
} from '../types'
import {
  DEFAULT_VISIBLE_METRICS,
  TIME_RANGE_OPTIONS,
  VISIBILITY_STORAGE_KEY,
  computeMetricStats,
  getMetricDefinition,
  getTimeRangeOption,
  metricDefinitions
} from '../lib/metric-config'

function readVisibleMetrics(): MetricId[] {
  try {
    const raw = localStorage.getItem(VISIBILITY_STORAGE_KEY)
    if (!raw) return [...DEFAULT_VISIBLE_METRICS]
    const parsed = JSON.parse(raw) as MetricId[]
    if (!Array.isArray(parsed)) return [...DEFAULT_VISIBLE_METRICS]
    const valid = parsed.filter((id) => metricDefinitions.some((m) => m.id === id))
    return valid.length > 0 ? valid : [...DEFAULT_VISIBLE_METRICS]
  } catch {
    return [...DEFAULT_VISIBLE_METRICS]
  }
}

function persistVisibleMetrics(ids: MetricId[]): void {
  try {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

export function useMonitoringSession() {
  const [samples, setSamples] = useState<SystemMetricsSample[]>([])
  const [timeRange, setTimeRangeState] = useState<TimeRangeId>('1m')
  const [paused, setPaused] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visibleMetrics, setVisibleMetrics] = useState<MetricId[]>(readVisibleMetrics)

  const pausedRef = useRef(paused)
  const maxSamplesRef = useRef(getTimeRangeOption('1m').sampleCount)
  const watchingRef = useRef(false)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    maxSamplesRef.current = getTimeRangeOption(timeRange).sampleCount
    setSamples((prev) =>
      prev.length > maxSamplesRef.current
        ? prev.slice(prev.length - maxSamplesRef.current)
        : prev
    )
  }, [timeRange])

  const pushSample = useCallback((sample: SystemMetricsSample) => {
    setSamples((prev) => {
      const next = [...prev, sample]
      const max = maxSamplesRef.current
      return next.length > max ? next.slice(next.length - max) : next
    })
    setIsLoading(false)
    setError(null)
  }, [])

  const startWatch = useCallback(async () => {
    if (watchingRef.current) return
    await electronService.system().startMetricsWatch()
    watchingRef.current = true
    setIsLive(true)
  }, [])

  const stopWatch = useCallback(async () => {
    if (!watchingRef.current) return
    await electronService.system().stopMetricsWatch()
    watchingRef.current = false
    setIsLive(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const start = async (): Promise<void> => {
      try {
        const seed = await electronService.system().getMetricsSample()
        if (cancelled) return
        pushSample(seed)

        unsubscribe = electronService.system().onMetricsUpdate((sample) => {
          if (cancelled || pausedRef.current) return
          pushSample(sample)
        })

        await startWatch()
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to start monitoring')
        setIsLoading(false)
        setIsLive(false)
      }
    }

    void start()

    return () => {
      cancelled = true
      unsubscribe?.()
      void stopWatch().catch(() => undefined)
    }
  }, [pushSample, startWatch, stopWatch])

  const pause = useCallback(async () => {
    setPaused(true)
    try {
      await stopWatch()
    } catch {
      // keep paused UI even if stop fails
    }
  }, [stopWatch])

  const resume = useCallback(async () => {
    setPaused(false)
    try {
      await startWatch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume monitoring')
    }
  }, [startWatch])

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const sample = await electronService.system().getMetricsSample()
      pushSample(sample)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metrics')
    } finally {
      setIsRefreshing(false)
    }
  }, [pushSample])

  const setTimeRange = useCallback((id: TimeRangeId) => {
    setTimeRangeState(id)
  }, [])

  const toggleMetricVisibility = useCallback((id: MetricId) => {
    setVisibleMetrics((prev) => {
      const next = prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
      // Keep at least one widget visible
      const safe = next.length === 0 ? prev : next
      persistVisibleMetrics(safe)
      return safe
    })
  }, [])

  const latest = samples.length > 0 ? samples[samples.length - 1] : null

  const metricSeries = useMemo(() => {
    const map = new Map<MetricId, { points: ChartPoint[]; stats: MetricStats | null }>()
    for (const def of metricDefinitions) {
      const points: ChartPoint[] = samples.map((s) => ({
        at: s.at,
        value: def.pick(s)
      }))
      const values = points.map((p) => p.value)
      map.set(def.id, { points, stats: computeMetricStats(values) })
    }
    return map
  }, [samples])

  const overallStatus: HealthStatus = useMemo(() => {
    let worst: HealthStatus = 'normal'
    for (const id of visibleMetrics) {
      const stats = metricSeries.get(id)?.stats
      if (!stats) continue
      if (stats.status === 'critical') return 'critical'
      if (stats.status === 'warning') worst = 'warning'
    }
    return worst
  }, [metricSeries, visibleMetrics])

  return {
    samples,
    latest,
    timeRange,
    timeRangeOptions: TIME_RANGE_OPTIONS,
    setTimeRange,
    paused,
    pause,
    resume,
    refresh,
    isRefreshing,
    isLive,
    isLoading,
    error,
    visibleMetrics,
    toggleMetricVisibility,
    metricDefinitions,
    getMetricDefinition,
    metricSeries,
    overallStatus
  }
}

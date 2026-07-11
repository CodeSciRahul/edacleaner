import { useEffect, useMemo, useState } from 'react'
import { electronService } from '@/services/electron-service'
import type { SystemMetricsSample } from '@shared/interfaces'

const MAX_SAMPLES = 60

export interface MetricsSeriesPoint {
  label: string
  value: number
}

function formatAgeLabel(sampleAt: number, newestAt: number): string {
  const ageSec = Math.max(0, Math.round((newestAt - sampleAt) / 1000))
  if (ageSec === 0) return 'now'
  return `-${ageSec}s`
}

function toSeries(
  samples: SystemMetricsSample[],
  pick: (s: SystemMetricsSample) => number
): MetricsSeriesPoint[] {
  if (samples.length === 0) {
    return [{ label: '…', value: 0 }]
  }

  const newestAt = samples[samples.length - 1].at
  return samples.map((sample, index) => {
    const isFirst = index === 0
    const isLast = index === samples.length - 1
    return {
      label: isFirst
        ? formatAgeLabel(sample.at, newestAt)
        : isLast
          ? 'now'
          : '',
      value: pick(sample)
    }
  })
}

/**
 * Live CPU / memory samples while the Performance page is mounted.
 */
export function useLiveSystemMetrics() {
  const [samples, setSamples] = useState<SystemMetricsSample[]>([])
  const [isLive, setIsLive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    const pushSample = (sample: SystemMetricsSample): void => {
      setSamples((prev) => {
        const next = [...prev, sample]
        return next.length > MAX_SAMPLES ? next.slice(next.length - MAX_SAMPLES) : next
      })
      setIsLoading(false)
    }

    const start = async (): Promise<void> => {
      try {
        const seed = await electronService.system().getMetricsSample()
        if (cancelled) return
        pushSample(seed)

        unsubscribe = electronService.system().onMetricsUpdate((sample) => {
          if (!cancelled) pushSample(sample)
        })

        await electronService.system().startMetricsWatch()
        if (!cancelled) setIsLive(true)
      } catch {
        if (!cancelled) {
          setIsLive(false)
          setIsLoading(false)
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      unsubscribe?.()
      setIsLive(false)
      void electronService.system().stopMetricsWatch().catch(() => undefined)
    }
  }, [])

  const latest = samples.length > 0 ? samples[samples.length - 1] : null

  const cpuSeries = useMemo(
    () => toSeries(samples, (s) => s.cpuPercent),
    [samples]
  )

  const memorySeries = useMemo(
    () => toSeries(samples, (s) => s.memoryPercent),
    [samples]
  )

  return {
    samples,
    latest,
    cpuSeries,
    memorySeries,
    isLive,
    isLoading
  }
}

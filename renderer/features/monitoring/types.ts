import type { SystemMetricsSample } from '@shared/interfaces'
import { colors } from '@/theme/colors'
import type { TranslationKey } from '@/i18n/locales/en'

export type MetricId = 'cpu' | 'memory'

export type TimeRangeId = '30s' | '1m' | '5m' | '15m' | '1h'

export type HealthStatus = 'normal' | 'warning' | 'critical'

export interface TimeRangeOption {
  id: TimeRangeId
  labelKey: TranslationKey
  sampleCount: number
}

export interface MetricDefinition {
  id: MetricId
  labelKey: TranslationKey
  shortLabelKey: TranslationKey
  unit: string
  color: string
  iconName: 'cpu' | 'memory'
  pick: (sample: SystemMetricsSample) => number
}

export interface MetricStats {
  current: number
  min: number
  max: number
  avg: number
  status: HealthStatus
}

export interface ChartPoint {
  at: number
  value: number
}

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { id: '30s', labelKey: 'monitoring.range.30s', sampleCount: 30 },
  { id: '1m', labelKey: 'monitoring.range.1m', sampleCount: 60 },
  { id: '5m', labelKey: 'monitoring.range.5m', sampleCount: 300 },
  { id: '15m', labelKey: 'monitoring.range.15m', sampleCount: 900 },
  { id: '1h', labelKey: 'monitoring.range.1h', sampleCount: 3600 }
]

export const DEFAULT_VISIBLE_METRICS: MetricId[] = ['cpu', 'memory']

export const VISIBILITY_STORAGE_KEY = 'eda-cleaner-monitoring-widgets'

export function getHealthStatus(value: number): HealthStatus {
  if (value > 85) return 'critical'
  if (value >= 70) return 'warning'
  return 'normal'
}

export function computeMetricStats(values: number[]): MetricStats | null {
  if (values.length === 0) return null
  const current = values[values.length - 1]
  let min = current
  let max = current
  let sum = 0
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  const avg = Math.round((sum / values.length) * 10) / 10
  return {
    current,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    avg,
    status: getHealthStatus(current)
  }
}

/** Re-export chart color tokens for convenience */
export const metricChartColors = {
  cpu: colors.chart.cpu,
  memory: colors.chart.ram
} as const

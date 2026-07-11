import type { SystemMetricsSample } from '@shared/interfaces'
import { colors } from '@/theme/colors'
import type { MetricDefinition, MetricId, TimeRangeOption } from '../types'
import {
  DEFAULT_VISIBLE_METRICS,
  TIME_RANGE_OPTIONS,
  VISIBILITY_STORAGE_KEY,
  computeMetricStats,
  getHealthStatus
} from '../types'

export const metricDefinitions: MetricDefinition[] = [
  {
    id: 'cpu',
    label: 'CPU Usage',
    shortLabel: 'CPU',
    unit: '%',
    color: colors.chart.cpu,
    iconName: 'cpu',
    pick: (s: SystemMetricsSample) => s.cpuPercent
  },
  {
    id: 'memory',
    label: 'Memory Usage',
    shortLabel: 'Memory',
    unit: '%',
    color: colors.chart.ram,
    iconName: 'memory',
    pick: (s: SystemMetricsSample) => s.memoryPercent
  }
]

export function getMetricDefinition(id: MetricId): MetricDefinition | undefined {
  return metricDefinitions.find((m) => m.id === id)
}

export function getTimeRangeOption(id: string): TimeRangeOption {
  return TIME_RANGE_OPTIONS.find((o) => o.id === id) ?? TIME_RANGE_OPTIONS[1]
}

export {
  TIME_RANGE_OPTIONS,
  DEFAULT_VISIBLE_METRICS,
  VISIBILITY_STORAGE_KEY,
  computeMetricStats,
  getHealthStatus
}

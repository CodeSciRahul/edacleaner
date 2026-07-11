import type { EChartsOption } from 'echarts'
import { colors } from '@/theme/colors'
import type { ChartPoint } from '../types'

export function buildLiveMetricChartOption(params: {
  points: ChartPoint[]
  color: string
  label: string
  unit: string
  isDark: boolean
  heightHint?: 'compact' | 'expanded'
}): EChartsOption {
  const { points, color, label, unit, isDark } = params
  const axisMuted = isDark ? colors.dark.textMuted : colors.light.textSecondary
  const splitLine = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.18)'
  const tooltipBg = isDark ? colors.dark.elevated : colors.light.elevated
  const tooltipBorder = isDark ? colors.dark.border : colors.light.border
  const tooltipText = isDark ? colors.dark.textPrimary : colors.light.textPrimary

  const times = points.map((p) => p.at)
  const values = points.map((p) => p.value)

  return {
    animation: false,
    grid: {
      left: 36,
      right: 12,
      top: 16,
      bottom: 28,
      containLabel: false
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: tooltipText, fontSize: 12 },
      valueFormatter: (value) => `${Number(value).toFixed(1)}${unit}`
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLabel: {
        color: axisMuted,
        fontSize: 10,
        formatter: (value: string | number) => {
          const t = new Date(Number(value))
          return `${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}`
        },
        interval: 'auto',
        hideOverlap: true
      },
      axisLine: { lineStyle: { color: splitLine } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      interval: 25,
      axisLabel: {
        color: axisMuted,
        fontSize: 10,
        formatter: (v: number) => `${v}`
      },
      splitLine: { lineStyle: { color: splitLine, type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: label,
        type: 'line',
        smooth: 0.25,
        showSymbol: false,
        sampling: 'lttb',
        data: values,
        lineStyle: { width: 2, color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}55` },
              { offset: 1, color: `${color}05` }
            ]
          }
        }
      }
    ]
  }
}

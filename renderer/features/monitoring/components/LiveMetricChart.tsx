import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ChartPoint } from '../types'
import { buildLiveMetricChartOption } from '../lib/chart-theme'
import { useThemeStore } from '@/store/theme-store'
import { cn } from '@/utils/cn'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

interface LiveMetricChartProps {
  points: ChartPoint[]
  color: string
  label: string
  unit?: string
  className?: string
  variant?: 'compact' | 'expanded'
}

export function LiveMetricChart({
  points,
  color,
  label,
  unit = '%',
  className,
  variant = 'compact'
}: LiveMetricChartProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.EChartsType | null>(null)
  const resolved = useThemeStore((s) => s.resolved)
  const isDark = resolved === 'dark'

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = echarts.init(el, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    const onResize = (): void => {
      chart.resize()
    }
    window.addEventListener('resize', onResize)

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(el)

    return () => {
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    chart.setOption(
      buildLiveMetricChartOption({
        points,
        color,
        label,
        unit,
        isDark,
        heightHint: variant
      }),
      { notMerge: true, lazyUpdate: true }
    )
  }, [points, color, label, unit, isDark, variant])

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full',
        variant === 'expanded' ? 'h-[360px]' : 'h-[180px]',
        className
      )}
      role="img"
      aria-label={`${label} chart`}
    />
  )
}

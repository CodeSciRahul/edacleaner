import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { colors } from '@/theme/colors'
import { useThemeStore } from '@/store/theme-store'
import { cn } from '@/utils/cn'
import type { TrendPoint } from '@/features/reports/lib/reports-analytics'
import { useTranslation } from '@/i18n/useTranslation'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

interface ReportsStorageChartProps {
  data: TrendPoint[]
  weekTotalGb: number
  className?: string
}

function buildStorageBarOption(params: {
  labels: string[]
  values: number[]
  isDark: boolean
  seriesName: string
}): EChartsOption {
  const { labels, values, isDark, seriesName } = params
  const axisMuted = isDark ? colors.dark.textMuted : colors.light.textSecondary
  const splitLine = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.18)'
  const tooltipBg = isDark ? colors.dark.elevated : colors.light.elevated
  const tooltipBorder = isDark ? colors.dark.border : colors.light.border
  const tooltipText = isDark ? colors.dark.textPrimary : colors.light.textPrimary
  const barColor = colors.chart.disk
  const max = Math.max(...values, 0.05)

  return {
    animationDuration: 400,
    animationEasing: 'cubicOut',
    grid: {
      left: 28,
      right: 8,
      top: 8,
      bottom: 22,
      containLabel: false
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: tooltipText, fontSize: 12 },
      valueFormatter: (value) => `${Number(value).toFixed(2)} GB`
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: axisMuted, fontSize: 10 },
      axisLine: { lineStyle: { color: splitLine } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: Number((max * 1.15).toFixed(3)),
      splitNumber: 3,
      axisLabel: {
        color: axisMuted,
        fontSize: 9,
        formatter: (v: number) => (v === 0 ? '0' : v.toFixed(1))
      },
      splitLine: { lineStyle: { color: splitLine, type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: values,
        barMaxWidth: 22,
        itemStyle: {
          color: barColor,
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: { color: barColor }
        }
      }
    ]
  }
}

/**
 * Compact storage-reclaimed chart (ECharts bars — same stack as Monitoring).
 */
export function ReportsStorageChart({
  data,
  weekTotalGb,
  className
}: ReportsStorageChartProps): React.ReactElement {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.EChartsType | null>(null)
  const resolved = useThemeStore((s) => s.resolved)
  const isDark = resolved === 'dark'
  const allZero = data.every((d) => d.value === 0)

  const labels = useMemo(() => data.map((d) => d.label), [data])
  const values = useMemo(() => data.map((d) => d.value), [data])

  useEffect(() => {
    const el = containerRef.current
    if (!el || allZero) return

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
  }, [allZero])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || allZero) return
    chart.setOption(
      buildStorageBarOption({
        labels,
        values,
        isDark,
        seriesName: t('reports.trendTitle')
      }),
      { notMerge: true, lazyUpdate: true }
    )
  }, [labels, values, isDark, allZero, t])

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-md sm:p-5',
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-card-title font-medium text-foreground">
            {t('reports.trendTitle')}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('reports.trendSubtitle')}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
          {weekTotalGb.toFixed(2)} GB
        </span>
      </div>

      {allZero ? (
        <div className="flex h-[110px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-xs text-muted-foreground">
          {t('reports.trendEmpty')}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-[110px] w-full"
          role="img"
          aria-label={t('reports.trendTitle')}
        />
      )}
    </div>
  )
}

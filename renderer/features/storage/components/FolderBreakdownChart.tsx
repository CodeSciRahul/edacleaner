import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts/core'
import { PieChart } from 'echarts/charts'
import { TooltipComponent, GraphicComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useThemeStore } from '@/store/theme-store'
import { colors } from '@/theme/colors'
import { cn } from '@/utils/cn'

echarts.use([PieChart, TooltipComponent, GraphicComponent, CanvasRenderer])

export interface BreakdownChartSegment {
  label: string
  bytes: number
  percent: number
  color: string
  sizeLabel: string
  path?: string
}

interface FolderBreakdownChartProps {
  segments: BreakdownChartSegment[]
  centerLabel?: string
  className?: string
  onSegmentClick?: (segment: BreakdownChartSegment) => void
}

function buildDonutOption(
  segments: BreakdownChartSegment[],
  isDark: boolean,
  centerLabel: string
): EChartsOption {
  const textPrimary = isDark ? colors.dark.textPrimary : colors.light.textPrimary
  const textMuted = isDark ? colors.dark.textMuted : colors.light.textSecondary
  const tooltipBg = isDark ? colors.dark.elevated : colors.light.elevated
  const tooltipBorder = isDark ? colors.dark.border : colors.light.border

  return {
    animationDuration: 700,
    animationEasing: 'cubicOut',
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBg,
      borderColor: tooltipBorder,
      textStyle: { color: textPrimary, fontSize: 12 },
      formatter: (params) => {
        const p = params as {
          name?: string
          percent?: number
          marker?: string
          data?: { sizeLabel?: string; path?: string }
        }
        const size = p.data?.sizeLabel ?? ''
        const hint = p.data?.path ? '<br/><span style="opacity:0.7">Click to open folder</span>' : ''
        return `${p.marker ?? ''}<b>${p.name}</b><br/>${size} · ${p.percent?.toFixed(1) ?? 0}%${hint}`
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        cursor: 'pointer',
        itemStyle: {
          borderRadius: 8,
          borderColor: isDark ? colors.dark.surface : '#fff',
          borderWidth: 3
        },
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: {
            shadowBlur: 16,
            shadowColor: 'rgba(0,0,0,0.2)'
          }
        },
        data: segments.map((s) => ({
          name: s.label,
          value: s.bytes,
          sizeLabel: s.sizeLabel,
          path: s.path,
          itemStyle: { color: s.color }
        }))
      }
    ],
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '42%',
        style: {
          text: centerLabel,
          align: 'center',
          fill: textMuted,
          fontSize: 11,
          fontWeight: 500
        }
      },
      {
        type: 'text',
        left: 'center',
        top: '50%',
        style: {
          text: `${segments.length}`,
          align: 'center',
          fill: textPrimary,
          fontSize: 28,
          fontWeight: 600,
          fontFamily: 'inherit'
        }
      },
      {
        type: 'text',
        left: 'center',
        top: '62%',
        style: {
          text: 'categories',
          align: 'center',
          fill: textMuted,
          fontSize: 11
        }
      }
    ]
  }
}

export function FolderBreakdownChart({
  segments,
  centerLabel = 'Folders',
  className,
  onSegmentClick
}: FolderBreakdownChartProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.EChartsType | null>(null)
  const onClickRef = useRef(onSegmentClick)
  const segmentsRef = useRef(segments)
  const resolved = useThemeStore((s) => s.resolved)
  const isDark = resolved === 'dark'

  onClickRef.current = onSegmentClick
  segmentsRef.current = segments

  const option = useMemo(
    () => buildDonutOption(segments, isDark, centerLabel),
    [segments, isDark, centerLabel]
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = echarts.init(el, undefined, { renderer: 'canvas' })
    chartRef.current = chart

    chart.on('click', (params) => {
      if (params.componentType !== 'series') return
      const name = String(params.name ?? '')
      const segment = segmentsRef.current.find((s) => s.label === name)
      if (segment?.path) onClickRef.current?.(segment)
    })

    const onResize = (): void => chart.resize()
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
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  return (
    <div
      ref={containerRef}
      className={cn('h-[280px] w-full min-w-[220px] cursor-pointer', className)}
      role="img"
      aria-label="Folder usage donut chart. Click a slice to open that folder."
    />
  )
}

import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { useId, useMemo, useState } from 'react'

interface DataPoint {
  label: string
  value: number
}

interface PerformanceGraphProps {
  title?: string
  subtitle?: string
  data: DataPoint[]
  color?: keyof typeof colors.chart
  height?: number
  className?: string
  valueMax?: number
  currentValueLabel?: string
  /** Show filled area under the line */
  filled?: boolean
  /** Show interactive hover tooltip */
  interactive?: boolean
  /** Format hover value for tooltip */
  formatValue?: (value: number) => string
  unitLabel?: string
  emptyMessage?: string
}

export function PerformanceGraph({
  title,
  subtitle,
  data,
  color = 'cpu',
  height = 160,
  className,
  valueMax,
  currentValueLabel,
  filled = false,
  interactive = false,
  formatValue,
  unitLabel,
  emptyMessage
}: PerformanceGraphProps): React.ReactElement {
  const strokeColor = colors.chart[color]
  const gradientId = useId().replace(/:/g, '')
  const max = valueMax ?? Math.max(...data.map((d) => d.value), 1)
  const width = 100
  const padding = 4
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const coords = useMemo(
    () =>
      data.map((d, i) => {
        const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2)
        const y = height - padding - (Math.min(d.value, max) / max) * (height - padding * 2)
        return { x, y, ...d }
      }),
    [data, height, max]
  )

  const points = coords.map((c) => `${c.x},${c.y}`).join(' ')
  const areaPath =
    coords.length > 0
      ? `M ${coords[0]!.x} ${height - padding} L ${coords.map((c) => `${c.x},${c.y}`).join(' L ')} L ${coords[coords.length - 1]!.x} ${height - padding} Z`
      : ''

  const allZero = data.every((d) => d.value === 0)
  const hover = hoverIndex != null ? coords[hoverIndex] : null

  function handleMove(clientX: number, rect: DOMRect): void {
    if (!interactive || data.length === 0) return
    const rel = (clientX - rect.left) / rect.width
    const idx = Math.round(rel * (data.length - 1))
    setHoverIndex(Math.min(data.length - 1, Math.max(0, idx)))
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-md sm:p-6',
        className
      )}
    >
      {(title || currentValueLabel || subtitle) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-card-title font-medium text-foreground">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {currentValueLabel ? (
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
              {currentValueLabel}
            </span>
          ) : null}
        </div>
      )}

      {allZero && emptyMessage ? (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-xs text-muted-foreground"
          style={{ height }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div
          className="relative"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => handleMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        >
          {interactive && hover ? (
            <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95 duration-150">
              <p className="font-medium text-foreground">{hover.label}</p>
              <p className="tabular-nums text-muted-foreground">
                {formatValue ? formatValue(hover.value) : hover.value}
                {unitLabel ? ` ${unitLabel}` : ''}
              </p>
            </div>
          ) : null}

          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {filled ? (
              <>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path
                  d={areaPath}
                  fill={`url(#${gradientId})`}
                  className="transition-all duration-500"
                />
              </>
            ) : null}
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              className="transition-all duration-500"
            />
            {interactive && hover ? (
              <>
                <line
                  x1={hover.x}
                  x2={hover.x}
                  y1={padding}
                  y2={height - padding}
                  stroke={strokeColor}
                  strokeOpacity="0.25"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={hover.x}
                  cy={hover.y}
                  r="1.6"
                  fill={strokeColor}
                  className="transition-all duration-150"
                />
              </>
            ) : null}
          </svg>
        </div>
      )}

      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

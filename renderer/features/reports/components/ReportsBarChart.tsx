import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { useState } from 'react'

interface BarPoint {
  label: string
  value: number
}

interface ReportsBarChartProps {
  title: string
  subtitle?: string
  data: BarPoint[]
  color?: keyof typeof colors.chart
  className?: string
  formatValue?: (value: number) => string
  emptyMessage?: string
  height?: number
}

export function ReportsBarChart({
  title,
  subtitle,
  data,
  color = 'cpu',
  className,
  formatValue,
  emptyMessage,
  height = 140
}: ReportsBarChartProps): React.ReactElement {
  const fill = colors.chart[color]
  const max = Math.max(...data.map((d) => d.value), 1)
  const allZero = data.every((d) => d.value === 0)
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-card transition-shadow duration-200 hover:shadow-md sm:p-6',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-card-title font-medium text-foreground">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>

      {allZero && emptyMessage ? (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 text-center text-xs text-muted-foreground"
          style={{ height }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }} onMouseLeave={() => setHover(null)}>
          {data.map((point, index) => {
            const pct = Math.max(6, (point.value / max) * 100)
            const active = hover === index
            return (
              <button
                key={`${point.label}-${index}`}
                type="button"
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-end outline-none"
                style={{ height: '100%' }}
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                aria-label={`${point.label}: ${formatValue ? formatValue(point.value) : point.value}`}
              >
                {active ? (
                  <span className="pointer-events-none absolute -top-1 z-10 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-[10px] font-medium tabular-nums text-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-150">
                    {formatValue ? formatValue(point.value) : point.value}
                  </span>
                ) : null}
                <span
                  className={cn(
                    'w-full max-w-[28px] rounded-t-md transition-all duration-300 ease-out',
                    active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
                  )}
                  style={{
                    height: `${pct}%`,
                    backgroundColor: fill,
                    boxShadow: active ? `0 0 0 2px ${fill}33` : undefined
                  }}
                />
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-2 flex justify-between gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
        {data.map((point, index) => (
          <span key={`${point.label}-${index}`} className="min-w-0 flex-1 truncate text-center">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  )
}

import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'

interface DataPoint {
  label: string
  value: number
}

interface PerformanceGraphProps {
  title?: string
  data: DataPoint[]
  color?: keyof typeof colors.chart
  height?: number
  className?: string
}

export function PerformanceGraph({
  title,
  data,
  color = 'cpu',
  height = 160,
  className
}: PerformanceGraphProps): React.ReactElement {
  const strokeColor = colors.chart[color]
  const max = Math.max(...data.map((d) => d.value), 1)
  const width = 100
  const padding = 4

  const points = data
    .map((d, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2)
      const y = height - padding - (d.value / max) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 shadow-card', className)}>
      {title && (
        <h3 className="mb-4 text-card-title font-medium text-foreground">{title}</h3>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="transition-all duration-300"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

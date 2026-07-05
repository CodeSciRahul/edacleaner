import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'

export type MetricColor = 'cpu' | 'ram' | 'disk' | 'battery' | 'network'

const colorMap: Record<MetricColor, string> = {
  cpu: colors.chart.cpu,
  ram: colors.chart.ram,
  disk: colors.chart.disk,
  battery: colors.chart.battery,
  network: colors.chart.network
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: MetricColor
  label?: string
  sublabel?: string
  className?: string
}

export function CircularProgress({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = 'cpu',
  label,
  sublabel,
  className
}: CircularProgressProps): React.ReactElement {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const strokeColor = colorMap[color]

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
          style={
            {
              '--circumference': circumference,
              '--offset': offset
            } as React.CSSProperties
          }
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {Math.round(pct)}%
        </span>
        {label && (
          <span className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</span>
        )}
      </div>
      {sublabel && (
        <p className="mt-2 text-center text-xs text-muted-foreground">{sublabel}</p>
      )}
    </div>
  )
}

import { Zap, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { formatBytes } from '@shared/utils'
import type { MemoryInfo } from '@shared/interfaces'

export type PerformanceHealth = 'good' | 'warning' | 'critical'

interface PerformanceHeroProps {
  score: number | null
  health: PerformanceHealth
  title: string
  message: string
  memory?: MemoryInfo
  diskFreeLabel?: string
  isBoosting: boolean
  isLoading: boolean
  onBoost: () => void
  onCancel: () => void
}

const healthStroke: Record<PerformanceHealth, string> = {
  good: colors.semantic.success,
  warning: colors.semantic.warning,
  critical: colors.semantic.error
}

const healthChip: Record<PerformanceHealth, string> = {
  good: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive'
}

const healthLabel: Record<PerformanceHealth, string> = {
  good: 'Healthy',
  warning: 'Needs attention',
  critical: 'Under pressure'
}

export function PerformanceHero({
  score,
  health,
  title,
  message,
  memory,
  diskFreeLabel,
  isBoosting,
  isLoading,
  onBoost,
  onCancel
}: PerformanceHeroProps): React.ReactElement {
  const size = 148
  const strokeWidth = 10
  const pct = score ?? 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference
  const stroke = healthStroke[health]

  return (
    <section
      aria-label="Performance overview"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <div className="relative grid gap-8 p-6 lg:grid-cols-[auto_1fr] lg:items-center lg:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              health === 'good'
                ? 'radial-gradient(ellipse 70% 80% at 0% 50%, hsl(142 71% 45% / 0.12), transparent 55%)'
                : health === 'warning'
                  ? 'radial-gradient(ellipse 70% 80% at 0% 50%, hsl(38 92% 50% / 0.12), transparent 55%)'
                  : 'radial-gradient(ellipse 70% 80% at 0% 50%, hsl(0 84% 60% / 0.12), transparent 55%)'
          }}
          aria-hidden="true"
        />

        <div className="relative flex justify-center lg:justify-start">
          <div className="relative inline-flex flex-col items-center">
            <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/50"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={score == null ? circumference : offset}
                className="transition-[stroke-dashoffset] duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {score == null ? '—' : score}
              </span>
              <span className="mt-0.5 text-xs font-medium text-muted-foreground">Score</span>
            </div>
          </div>
        </div>

        <div className="relative min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                healthChip[health]
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {healthLabel[health]}
            </span>
            <span className="text-xs text-muted-foreground">Performance health</span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatPill
              label="Memory"
              value={
                memory
                  ? `${memory.usedPercent}% · ${formatBytes(memory.used)}`
                  : isLoading
                    ? '…'
                    : '—'
              }
            />
            <StatPill label="Disk free" value={diskFreeLabel ?? (isLoading ? '…' : '—')} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {isBoosting ? (
              <Button size="sm" variant="outline" className="h-10 gap-2 px-4" onClick={onCancel}>
                Cancel Boost
              </Button>
            ) : null}
            <Button
              size="sm"
              className="h-10 gap-2 px-5 text-[13px] shadow-sm"
              disabled={isBoosting || isLoading}
              onClick={onBoost}
            >
              {isBoosting ? (
                <>
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Boosting…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Boost Now
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Clears temps, caches, and refreshes system stats safely.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/80 bg-background/60 px-3.5 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

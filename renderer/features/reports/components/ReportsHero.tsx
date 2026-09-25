import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronDown,
  Download,
  Eraser,
  FileBarChart2,
  HardDrive,
  HeartPulse,
  Loader2,
  Lock,
  ScanSearch,
  Sparkles,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { useTranslation } from '@/i18n/useTranslation'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
import { usePlanCheckout } from '@/features/subscription/hooks/usePlanCheckout'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import type { HealthBand } from '@/features/reports/lib/reports-analytics'
import type { ReportExportFormat } from '@/features/reports/lib/export-report'
import reportsHeroBgDark from '@/assets/reports/reports-hero-bg-dark.png'
import reportsHeroBgLight from '@/assets/reports/reports-hero-bg-light.png'

export type ReportsHeroPhase = 'ready' | 'empty' | 'locked'

interface ReportsHeroProps {
  phase: ReportsHeroPhase
  healthBand: HealthBand
  title: string
  message: string
  healthScore: number | null
  spaceLabel: string
  optimizationsLabel: string
  scansLabel: string
  activityHint: string
  showClear?: boolean
  onClear?: () => void
  showExport?: boolean
  exporting?: boolean
  onExport?: (format: ReportExportFormat) => void
  animateKey?: number
}

const bandStroke: Record<HealthBand, string> = {
  excellent: colors.semantic.success,
  good: colors.semantic.success,
  fair: colors.semantic.warning,
  attention: colors.semantic.error
}

const bandChip: Record<HealthBand, string> = {
  excellent: 'border-success/30 bg-success/10 text-success',
  good: 'border-success/30 bg-success/10 text-success',
  fair: 'border-warning/30 bg-warning/10 text-warning',
  attention: 'border-destructive/30 bg-destructive/10 text-destructive'
}

const bandBorder: Record<HealthBand, string> = {
  excellent: 'border-success/25',
  good: 'border-success/25',
  fair: 'border-warning/25',
  attention: 'border-destructive/25'
}

const bandOrb: Record<HealthBand, string> = {
  excellent: 'bg-success/15',
  good: 'bg-success/15',
  fair: 'bg-warning/15',
  attention: 'bg-destructive/15'
}

export function ReportsHero({
  phase,
  healthBand,
  title,
  message,
  healthScore,
  spaceLabel,
  optimizationsLabel,
  scansLabel,
  activityHint,
  showClear = false,
  onClear,
  showExport = false,
  exporting = false,
  onExport,
  animateKey = 0
}: ReportsHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { startCheckout, checkingOut } = usePlanCheckout()
  const locked = phase === 'locked'
  const ready = phase === 'ready'
  const displayScore = locked ? null : healthScore
  const displaySpace = locked ? '—' : spaceLabel
  const displayOptimizations = locked ? '—' : optimizationsLabel
  const displayScans = locked ? '—' : scansLabel
  const borderClass = ready
    ? bandBorder[healthBand]
    : locked
      ? 'border-primary/20'
      : 'border-border'
  const orbClass = ready ? bandOrb[healthBand] : 'bg-primary/15'
  const [exportOpen, setExportOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const onPointerDown = (event: MouseEvent): void => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setExportOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [exportOpen])

  useEffect(() => {
    if (locked || !showExport) setExportOpen(false)
  }, [locked, showExport])

  function handleExport(format: ReportExportFormat): void {
    setExportOpen(false)
    onExport?.(format)
  }

  const panelStatus = locked
    ? t('reports.hero.lockedBadge')
    : ready
      ? t('reports.health.title')
      : t('reports.insights')

  return (
    <section
      aria-label={t('reports.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        borderClass
      )}
    >
      <img
        src={reportsHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={reportsHeroBgDark}
        alt=""
        className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
        draggable={false}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/92 via-card/62 to-transparent sm:via-card/45"
        aria-hidden="true"
      />
      <div
        className={cn(
          'pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full blur-3xl',
          orbClass
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                locked
                  ? 'border-primary/25 bg-primary/10 text-primary'
                  : ready
                    ? bandChip[healthBand]
                    : 'border-primary/25 bg-primary/10 text-primary'
              )}
            >
              {locked ? (
                <Lock className="h-3 w-3" aria-hidden="true" />
              ) : ready ? (
                <Sparkles className="h-3 w-3" aria-hidden="true" />
              ) : (
                <FileBarChart2 className="h-3 w-3" aria-hidden="true" />
              )}
              {locked
                ? t('reports.hero.lockedBadge')
                : ready
                  ? t('reports.health.title')
                  : t('reports.insights')}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('reports.hero.badge')}
            </span>
            {locked ? <PremiumBadge plan="premium" size="md" /> : null}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MetricTile
              icon={HardDrive}
              label={t('reports.spaceRecovered')}
              value={displaySpace}
              accentClass="bg-chart-disk/15 text-chart-disk"
            />
            <MetricTile
              icon={Sparkles}
              label={t('reports.optimizations')}
              value={displayOptimizations}
              accentClass="bg-warning/15 text-warning"
            />
            <MetricTile
              icon={ScanSearch}
              label={t('reports.smartScans')}
              value={displayScans}
              accentClass="bg-primary/15 text-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {locked ? (
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px] ring-1 ring-primary/20"
                disabled={checkingOut}
                onClick={() => void startCheckout('premium')}
              >
                {checkingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Lock className="h-4 w-4" aria-hidden="true" />
                )}
                {t('reports.upsell.cta')}
                <PremiumBadge plan="premium" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px]"
                onClick={() => navigate('/smart-scan')}
              >
                <ScanSearch className="h-4 w-4" aria-hidden="true" />
                {t('reports.hero.openScan')}
              </Button>
            )}
            {!locked ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={() => navigate('/cleanup')}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('reports.empty.ctaCleanup')}
              </Button>
            ) : null}
            {showExport && onExport ? (
              <div className="relative z-40" ref={exportMenuRef}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                  onClick={() => setExportOpen((open) => !open)}
                  disabled={locked || exporting}
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('reports.export')}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                </Button>
                {exportOpen ? (
                  <div
                    role="menu"
                    className="absolute left-0 top-full z-50 mt-1.5 min-w-[10.5rem] rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
                  >
                    {(
                      [
                        { format: 'pdf' as const, label: t('reports.exportAsPdf') },
                        { format: 'csv' as const, label: t('reports.exportAsCsv') },
                        { format: 'doc' as const, label: t('reports.exportAsDoc') }
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.format}
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                        onClick={() => handleExport(item.format)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {showClear && onClear ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onClear}
                disabled={locked}
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                {t('reports.clear')}
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{activityHint}</p>
        </div>

        <div className="flex shrink-0 justify-center lg:justify-end">
          <HealthScorePanel
            key={animateKey}
            score={displayScore}
            stroke={ready ? bandStroke[healthBand] : colors.primary[500]}
            statusLabel={panelStatus}
            hint={activityHint}
          />
        </div>
      </div>
    </section>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  accentClass
}: {
  icon: LucideIcon
  label: string
  value: string
  accentClass: string
}): React.ReactElement {
  return (
    <div className="flex min-w-[7.25rem] items-center gap-2.5 rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          accentClass
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

function HealthScorePanel({
  score,
  stroke,
  statusLabel,
  hint
}: {
  score: number | null
  stroke: string
  statusLabel: string
  hint: string
}): React.ReactElement {
  const { t } = useTranslation()
  const barPct = score == null ? 0 : Math.min(100, Math.max(0, score))

  return (
    <div
      className={cn(
        'relative w-full max-w-[14.5rem] rounded-2xl border border-border/60',
        'bg-background/55 p-4 backdrop-blur-sm',
        'animate-in zoom-in-95 duration-500'
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <HeartPulse className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('reports.health.score')}
          </p>
          <p className="text-xs font-medium text-foreground">{statusLabel}</p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {score == null ? '—' : score}
        </span>
        <span className="mb-1.5 text-xs font-medium text-muted-foreground">/ 100</span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score ?? undefined}
        aria-label={t('reports.health.score')}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${barPct}%`, backgroundColor: stroke }}
        />
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Download,
  Eraser,
  FileBarChart2,
  Lock,
  ScanSearch,
  Sparkles,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import { PremiumBadge } from '@/features/entitlements/components/PremiumBadge'
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

const bandColor: Record<HealthBand, 'battery' | 'cpu' | 'network' | 'disk'> = {
  excellent: 'battery',
  good: 'cpu',
  fair: 'network',
  attention: 'disk'
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
  const locked = phase === 'locked'
  const borderClass =
    phase === 'ready' ? bandBorder[healthBand] : locked ? 'border-primary/20' : 'border-border'
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

  return (
    <section
      aria-label={t('reports.hero.overview')}
      className={cn(
        'relative rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        'animate-in fade-in-0 duration-300',
        borderClass
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        aria-hidden="true"
      >
        <img
          src={reportsHeroBgLight}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-right dark:hidden"
          draggable={false}
        />
        <img
          src={reportsHeroBgDark}
          alt=""
          className="absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card/92 via-card/60 to-transparent sm:via-card/42" />
      </div>

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                locked
                  ? 'border-primary/25 bg-primary/10 text-primary'
                  : phase === 'ready'
                    ? bandChip[healthBand]
                    : 'border-border bg-muted/50 text-muted-foreground'
              )}
            >
              {locked ? (
                <Lock className="h-3 w-3" aria-hidden="true" />
              ) : phase === 'ready' ? (
                <Sparkles className="h-3 w-3" aria-hidden="true" />
              ) : (
                <FileBarChart2 className="h-3 w-3" aria-hidden="true" />
              )}
              {locked
                ? t('reports.hero.lockedBadge')
                : phase === 'ready'
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
            <StatPill label={t('reports.spaceRecovered')} value={spaceLabel} />
            <StatPill label={t('reports.optimizations')} value={optimizationsLabel} />
            <StatPill label={t('reports.smartScans')} value={scansLabel} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {locked ? (
              <Button
                size="sm"
                className="h-9 gap-2 rounded-lg px-4 text-[13px] ring-1 ring-primary/20"
                disabled
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                {t('reports.insights')}
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
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              onClick={() => navigate('/cleanup')}
              disabled={locked}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('reports.empty.ctaCleanup')}
            </Button>
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
          <div
            key={animateKey}
            className="inline-flex flex-col items-center rounded-2xl border border-border/60 bg-background/50 px-5 py-4 backdrop-blur-sm animate-in zoom-in-95 duration-500"
          >
            <CircularProgress
              value={healthScore ?? 0}
              color={bandColor[healthBand]}
              size={112}
              strokeWidth={9}
              className={cn(healthScore == null && 'opacity-40')}
              label={t('reports.health.score')}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

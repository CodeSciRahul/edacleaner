import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  CheckCircle2,
  FileBarChart2,
  HardDrive,
  HeartPulse,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Zap
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { formatBytes } from '@shared/utils'
import type { SmartScanResult } from '@shared/interfaces'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'
import { useTranslation } from '@/i18n/useTranslation'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import scanHeroBgDark from '@/assets/smart-scan/scan-hero-bg-dark.png'
import scanHeroBgLight from '@/assets/smart-scan/scan-hero-bg-light.png'

export type SmartScanHeroPhase = 'empty' | 'idle' | 'scanning' | 'complete'

interface SmartScanHeroProps {
  phase: SmartScanHeroPhase
  result?: SmartScanResult | null
  isScanning: boolean
  cancelPending: boolean
  progressMessage?: string
  progressPercent?: number | null
  onScan: () => void
  onCancel: () => void
}

export function SmartScanHero({
  phase,
  result,
  isScanning,
  cancelPending,
  progressMessage,
  progressPercent = null,
  onScan,
  onCancel
}: SmartScanHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const complete = phase === 'complete' && result
  const healthy = complete ? result.areasNeedingAttention === 0 : false

  let badgeLabel: string
  let headline: string
  let subtext: string

  if (complete) {
    badgeLabel = t('smartScan.hero.complete')
    headline = result.summaryTitle
    subtext = result.summaryMessage
  } else if (phase === 'scanning') {
    badgeLabel = t('smartScan.hero.badgeScanning')
    headline = t('smartScan.status.scanningTitle')
    subtext = progressMessage ?? t('smartScan.status.scanningMsg')
  } else if (phase === 'empty') {
    badgeLabel = t('smartScan.hero.badgeEmpty')
    headline = t('smartScan.emptyTitle')
    subtext = t('smartScan.emptyDesc')
  } else {
    badgeLabel = t('smartScan.hero.badgeReady')
    headline = t('smartScan.status.readyTitle')
    subtext = t('smartScan.status.readyMsg')
  }

  const scanLabel =
    phase === 'empty' ? t('smartScan.firstScan') : complete ? t('smartScan.rescan') : t('smartScan.start')

  const healthValue = complete ? String(result.healthScore) : phase === 'scanning' ? '…' : '—'
  const issuesValue = complete
    ? String(result.areasNeedingAttention)
    : phase === 'scanning'
      ? '…'
      : '—'
  const reclaimValue = complete
    ? formatBytes(result.totalReclaimableBytes)
    : phase === 'scanning'
      ? progressPercent != null
        ? `${Math.round(progressPercent)}%`
        : '…'
      : '—'
  const reclaimLabel =
    phase === 'scanning' && !complete
      ? t('smartScan.hero.statProgress')
      : t('smartScan.hero.statReclaimable')

  let tip: string
  if (complete) {
    tip =
      result.totalReclaimableBytes > 0
        ? t('smartScan.hero.reclaimHint', { bytes: formatBytes(result.totalReclaimableBytes) })
        : t('smartScan.hero.lastScanned', {
            when: formatRelativeScanTime(result.scannedAt)
          })
  } else if (phase === 'scanning') {
    tip = t('smartScan.hero.tipScanning')
  } else if (phase === 'empty') {
    tip = t('smartScan.hero.tipEmpty')
  } else {
    tip = t('smartScan.hero.tipReady')
  }

  const score = complete ? result.healthScore : null
  const scoreStroke =
    complete && healthy
      ? colors.semantic.success
      : complete
        ? colors.semantic.warning
        : phase === 'scanning'
          ? colors.primary[500]
          : colors.chart.cpu
  const scoreHint = complete
    ? result.areasNeedingAttention > 0
      ? t('home.hero.issuesPanelHint', { count: result.areasNeedingAttention })
      : t('smartScan.hero.scoreHint')
    : phase === 'scanning'
      ? t('smartScan.hero.tipScanning')
      : t('smartScan.hero.idlePanelHint')

  return (
    <section
      aria-label={t('smartScan.title')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        complete && healthy
          ? 'border-success/25'
          : complete
            ? 'border-warning/25'
            : phase === 'scanning'
              ? 'border-primary/25'
              : 'border-primary/20'
      )}
    >
      <img
        src={scanHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={scanHeroBgDark}
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
          complete && healthy
            ? 'bg-success/15'
            : complete
              ? 'bg-warning/15'
              : 'bg-primary/15'
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                complete && healthy
                  ? 'border-success/30 bg-success/10 text-success'
                  : complete
                    ? 'border-warning/30 bg-warning/10 text-warning'
                    : phase === 'scanning'
                      ? 'border-primary/25 bg-primary/10 text-primary'
                      : 'border-primary/25 bg-primary/10 text-primary'
              )}
            >
              {complete && healthy ? (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              ) : complete ? (
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              ) : phase === 'scanning' ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : phase === 'empty' ? (
                <Sparkles className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              )}
              {badgeLabel}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('smartScan.title')}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {headline}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MetricTile
              icon={HeartPulse}
              label={t('smartScan.hero.statHealth')}
              value={healthValue}
              accentClass="bg-success/15 text-success"
            />
            <MetricTile
              icon={AlertTriangle}
              label={t('smartScan.hero.statIssues')}
              value={issuesValue}
              accentClass="bg-warning/15 text-warning"
            />
            <MetricTile
              icon={HardDrive}
              label={reclaimLabel}
              value={reclaimValue}
              accentClass="bg-chart-disk/15 text-chart-disk"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {isScanning ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onCancel}
                disabled={cancelPending}
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                {t('common.pause')}
              </Button>
            ) : (
              <Button size="sm" className="h-9 gap-2 rounded-lg px-4 text-[13px]" onClick={onScan}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {scanLabel}
              </Button>
            )}
            {isScanning ? (
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                disabled
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('common.scanning')}
              </Button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/cleanup')}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80',
                'bg-background/70 px-3 text-[13px] font-medium text-foreground backdrop-blur-sm',
                'transition-colors hover:bg-background/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
              {t('nav.cleanup')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/storage')}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80',
                'bg-background/70 px-3 text-[13px] font-medium text-foreground backdrop-blur-sm',
                'transition-colors hover:bg-background/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <HardDrive className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
              {t('nav.storage')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/performance')}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80',
                'bg-background/70 px-3 text-[13px] font-medium text-foreground backdrop-blur-sm',
                'transition-colors hover:bg-background/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <Zap className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
              {t('nav.performance')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80',
                'bg-background/70 px-3 text-[13px] font-medium text-foreground backdrop-blur-sm',
                'transition-colors hover:bg-background/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <FileBarChart2 className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
              {t('nav.reports')}
            </button>
          </div>

          <p className="text-xs text-muted-foreground">{tip}</p>
        </div>

        <div className="flex shrink-0 justify-center lg:justify-end">
          <HealthScorePanel
            score={score}
            progressPercent={phase === 'scanning' ? progressPercent : null}
            stroke={scoreStroke}
            statusLabel={
              complete
                ? healthy
                  ? t('smartScan.hero.healthyLabel')
                  : t('smartScan.hero.attentionLabel')
                : phase === 'scanning'
                  ? t('smartScan.hero.badgeScanning')
                  : t('smartScan.hero.badgeReady')
            }
            hint={scoreHint}
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
  progressPercent,
  stroke,
  statusLabel,
  hint
}: {
  score: number | null
  progressPercent: number | null
  stroke: string
  statusLabel: string
  hint: string
}): React.ReactElement {
  const { t } = useTranslation()
  const display = score ?? (progressPercent != null ? Math.round(progressPercent) : null)
  const barPct = display == null ? 0 : Math.min(100, Math.max(0, display))
  const suffix = score != null ? '/ 100' : progressPercent != null ? '%' : '/ 100'

  return (
    <div
      className={cn(
        'relative w-full max-w-[14.5rem] rounded-2xl border border-border/60',
        'bg-background/55 p-4 backdrop-blur-sm'
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <ScanSearch className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('smartScan.hero.healthScore')}
          </p>
          <p className="text-xs font-medium text-foreground">{statusLabel}</p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <span className="text-4xl font-semibold tabular-nums tracking-tight text-foreground">
          {display == null ? '—' : display}
        </span>
        <span className="mb-1.5 text-xs font-medium text-muted-foreground">{suffix}</span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={display ?? undefined}
        aria-label={t('smartScan.hero.healthScore')}
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

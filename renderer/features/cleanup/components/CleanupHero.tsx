import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  FileBarChart2,
  Files,
  HardDrive,
  Layers,
  Loader2,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Square
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { colors } from '@/theme/colors'
import { formatBytes } from '@shared/utils'
import type { CleanupWorkflowPhase } from '@/features/cleanup/lib/category-meta'
import { useTranslation } from '@/i18n/useTranslation'
import { featureHeroMinHeightClass } from '@/components/desktop/feature-hero'
import cleanupHeroBgDark from '@/assets/cleanup/cleanup-hero-bg-dark.png'
import cleanupHeroBgLight from '@/assets/cleanup/cleanup-hero-bg-light.png'

interface CleanupHeroProps {
  phase: CleanupWorkflowPhase
  reclaimableBytes: number
  selectedCount: number
  selectedBytes: number
  fileCount: number
  categoryCount: number
  scanned: boolean
  lastBytesFreed?: number
  lastFilesRemoved?: number
  busy: boolean
  isCleaning: boolean
  cancelPending: boolean
  optimizeDisabled: boolean
  onScan: () => void
  onCancel: () => void
  onOptimize: () => void
}

export function CleanupHero({
  phase,
  reclaimableBytes,
  selectedCount,
  selectedBytes,
  fileCount,
  categoryCount,
  scanned,
  lastBytesFreed,
  lastFilesRemoved,
  busy,
  isCleaning,
  cancelPending,
  optimizeDisabled,
  onScan,
  onCancel,
  onOptimize
}: CleanupHeroProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const optimized = phase === 'done'
  const scanning = phase === 'scan'
  const cleaning = phase === 'clean'

  let headline: string
  let subtext: string

  if (optimized) {
    headline =
      typeof lastBytesFreed === 'number' && lastBytesFreed > 0
        ? t('cleanup.hero.reclaimed', { bytes: formatBytes(lastBytesFreed) })
        : t('cleanup.hero.improved')
    subtext = t('cleanup.hero.doneSub')
  } else if (!scanned) {
    headline = t('cleanup.hero.idleHeadline')
    subtext = t('cleanup.hero.idleSub')
  } else if (reclaimableBytes > 0) {
    headline = t('cleanup.hero.readyHeadline', { bytes: formatBytes(reclaimableBytes) })
    subtext =
      selectedCount > 0
        ? selectedCount === 1
          ? t('cleanup.hero.selectedSubOne')
          : t('cleanup.hero.selectedSub', { count: selectedCount })
        : t('cleanup.hero.selectSub')
  } else {
    headline = t('cleanup.hero.tidyHeadline')
    subtext = t('cleanup.hero.tidySub')
  }

  const pillPlaceholder = busy ? '…' : '—'

  const reclaimLabel = optimized
    ? t('cleanup.hero.statFreed')
    : t('cleanup.hero.statReclaimable')
  const reclaimValue = optimized
    ? typeof lastBytesFreed === 'number'
      ? formatBytes(lastBytesFreed)
      : '—'
    : scanned
      ? formatBytes(selectedCount > 0 ? selectedBytes : reclaimableBytes)
      : pillPlaceholder

  const middleLabel = optimized
    ? t('cleanup.hero.statRemoved')
    : selectedCount > 0
      ? t('cleanup.hero.statSelected')
      : t('cleanup.hero.statCategories')
  const middleValue = optimized
    ? typeof lastFilesRemoved === 'number'
      ? String(lastFilesRemoved)
      : '—'
    : scanned
      ? String(selectedCount > 0 ? selectedCount : categoryCount)
      : pillPlaceholder

  const rightLabel = optimized
    ? t('cleanup.hero.statCategories')
    : t('cleanup.hero.statFiles')
  const rightValue = optimized
    ? selectedCount > 0
      ? String(selectedCount)
      : '—'
    : scanned
      ? String(fileCount)
      : pillPlaceholder

  let tip: string
  if (optimized) {
    tip = t('cleanup.hero.tipDone')
  } else if (busy) {
    tip = isCleaning ? t('cleanup.hero.tipCleaning') : t('cleanup.hero.tipScanning')
  } else if (!scanned) {
    tip = t('cleanup.hero.tipIdle')
  } else if (selectedCount > 0) {
    tip = t('cleanup.hero.tipSelected', {
      bytes: formatBytes(selectedBytes),
      count: selectedCount
    })
  } else {
    tip = t('cleanup.hero.tipReview')
  }

  const badgeLabel = optimized
    ? t('cleanup.hero.badgeSuccess')
    : scanning
      ? t('cleanup.hero.badgeScanning')
      : cleaning
        ? t('cleanup.hero.badgeCleaning')
        : scanned
          ? t('cleanup.hero.badgeReady')
          : t('cleanup.hero.badgeSafe')

  const panelBytes = optimized
    ? typeof lastBytesFreed === 'number'
      ? lastBytesFreed
      : 0
    : selectedCount > 0
      ? selectedBytes
      : reclaimableBytes
  const panelHint = optimized
    ? t('cleanup.hero.panelDoneHint')
    : scanned
      ? t('cleanup.hero.panelHint')
      : t('cleanup.hero.panelIdleHint')

  return (
    <section
      aria-label={t('cleanup.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        optimized
          ? 'border-success/25'
          : scanning || cleaning
            ? 'border-primary/25'
            : scanned && reclaimableBytes > 0
              ? 'border-chart-disk/25'
              : 'border-border'
      )}
    >
      <img
        src={cleanupHeroBgLight}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right dark:hidden"
        draggable={false}
        aria-hidden="true"
      />
      <img
        src={cleanupHeroBgDark}
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
          optimized
            ? 'bg-success/15'
            : scanning || cleaning
              ? 'bg-primary/15'
              : 'bg-chart-disk/15'
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
                'text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
                optimized
                  ? 'border-success/30 bg-success/10 text-success'
                  : scanning || cleaning
                    ? 'border-primary/25 bg-primary/10 text-primary'
                    : 'border-chart-disk/30 bg-chart-disk/10 text-chart-disk'
              )}
            >
              {optimized ? (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              ) : scanning || cleaning ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              )}
              {badgeLabel}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('nav.cleanup')}
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
              icon={HardDrive}
              label={reclaimLabel}
              value={reclaimValue}
              accentClass="bg-chart-disk/15 text-chart-disk"
            />
            <MetricTile
              icon={selectedCount > 0 && !optimized ? Layers : Files}
              label={middleLabel}
              value={middleValue}
              accentClass="bg-primary/15 text-primary"
            />
            <MetricTile
              icon={optimized ? Layers : Files}
              label={rightLabel}
              value={rightValue}
              accentClass="bg-success/15 text-success"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {busy ? (
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
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
                onClick={onScan}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {scanned ? t('cleanup.rescan') : t('cleanup.scan')}
              </Button>
            )}
            <Button
              size="sm"
              className="h-9 gap-2 rounded-lg px-4 text-[13px]"
              onClick={onOptimize}
              disabled={optimizeDisabled}
            >
              {isCleaning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {selectedCount > 0
                ? t('cleanup.optimizeCount', { count: selectedCount })
                : t('cleanup.optimize')}
            </Button>
            <button
              type="button"
              onClick={() => navigate('/smart-scan')}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border border-border/80',
                'bg-background/70 px-3 text-[13px] font-medium text-foreground backdrop-blur-sm',
                'transition-colors hover:bg-background/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              <ScanSearch className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
              {t('nav.smartScan')}
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
          <ReclaimPanel
            bytesLabel={
              scanned || optimized
                ? formatBytes(panelBytes)
                : busy
                  ? '…'
                  : '—'
            }
            hint={panelHint}
            optimized={optimized}
            progressPct={
              optimized
                ? 100
                : scanned && reclaimableBytes > 0
                  ? Math.min(
                      100,
                      Math.round(
                        ((selectedCount > 0 ? selectedBytes : reclaimableBytes) /
                          Math.max(reclaimableBytes, 1)) *
                          100
                      )
                    )
                  : 0
            }
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

function ReclaimPanel({
  bytesLabel,
  hint,
  optimized,
  progressPct
}: {
  bytesLabel: string
  hint: string
  optimized: boolean
  progressPct: number
}): React.ReactElement {
  const { t } = useTranslation()
  const stroke = optimized ? colors.semantic.success : colors.chart.disk

  return (
    <div
      className={cn(
        'relative w-full max-w-[14.5rem] rounded-2xl border border-border/60',
        'bg-background/55 p-4 backdrop-blur-sm',
        optimized && 'ring-1 ring-success/25'
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            optimized ? 'bg-success/15 text-success' : 'bg-chart-disk/15 text-chart-disk'
          )}
        >
          {optimized ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <HardDrive className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('cleanup.hero.panelTitle')}
          </p>
          <p className="text-xs font-medium text-foreground">
            {optimized ? t('cleanup.hero.badgeSuccess') : t('cleanup.hero.badgeSafe')}
          </p>
        </div>
      </div>

      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground sm:text-4xl">
        {bytesLabel}
      </p>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted/70"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPct}
        aria-label={t('cleanup.hero.panelTitle')}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${progressPct}%`, backgroundColor: stroke }}
        />
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

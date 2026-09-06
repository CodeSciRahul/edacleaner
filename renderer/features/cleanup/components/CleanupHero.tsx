import {
  CheckCircle2,
  FileBarChart2,
  HardDrive,
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

  return (
    <section
      aria-label={t('cleanup.hero.overview')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        optimized ? 'border-success/25' : 'border-border'
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
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
            {optimized ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            )}
            {optimized ? t('cleanup.hero.badgeSuccess') : t('cleanup.hero.badgeSafe')}
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              {headline}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label={reclaimLabel} value={reclaimValue} />
            <StatPill label={middleLabel} value={middleValue} />
            <StatPill label={rightLabel} value={rightValue} />
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
          </div>

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <JumpChip
              icon={ScanSearch}
              label={t('nav.smartScan')}
              onClick={() => navigate('/smart-scan')}
            />
            <JumpChip
              icon={HardDrive}
              label={t('nav.storage')}
              onClick={() => navigate('/storage')}
            />
            <JumpChip
              icon={FileBarChart2}
              label={t('nav.reports')}
              onClick={() => navigate('/reports')}
            />
          </div>

          <p className="text-xs text-muted-foreground">{tip}</p>
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

function JumpChip({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof ScanSearch
  label: string
  onClick: () => void
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/55 px-2.5 py-1',
        'text-[11px] font-medium text-muted-foreground backdrop-blur-sm',
        'transition-colors hover:border-primary/25 hover:bg-background/80 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
      {label}
    </button>
  )
}

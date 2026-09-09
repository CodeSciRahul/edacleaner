import {
  CheckCircle2,
  FileBarChart2,
  HardDrive,
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
  let badgeIcon: typeof CheckCircle2
  let headline: string
  let subtext: string

  if (complete) {
    badgeLabel = t('smartScan.hero.complete')
    badgeIcon = CheckCircle2
    headline = result.summaryTitle
    subtext = result.summaryMessage
  } else if (phase === 'scanning') {
    badgeLabel = t('smartScan.title')
    badgeIcon = ScanSearch
    headline = t('smartScan.status.scanningTitle')
    subtext = progressMessage ?? t('smartScan.status.scanningMsg')
  } else if (phase === 'empty') {
    badgeLabel = t('smartScan.title')
    badgeIcon = Sparkles
    headline = t('smartScan.emptyTitle')
    subtext = t('smartScan.emptyDesc')
  } else {
    badgeLabel = t('smartScan.title')
    badgeIcon = ShieldCheck
    headline = t('smartScan.status.readyTitle')
    subtext = t('smartScan.status.readyMsg')
  }

  const scanLabel =
    phase === 'empty' ? t('smartScan.firstScan') : complete ? t('smartScan.rescan') : t('smartScan.start')

  /** Single secondary nav row — same chip style for every destination. */
  const navLinks = [
    { href: '/cleanup', label: t('nav.cleanup'), icon: Trash2 },
    { href: '/storage', label: t('nav.storage'), icon: HardDrive },
    { href: '/performance', label: t('nav.performance'), icon: Zap },
    { href: '/reports', label: t('nav.reports'), icon: FileBarChart2 }
  ] as const

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

  const BadgeIcon = badgeIcon

  return (
    <section
      aria-label={t('smartScan.title')}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-7',
        featureHeroMinHeightClass,
        'animate-in fade-in-0 duration-300',
        complete && healthy ? 'border-success/25' : complete ? 'border-primary/25' : 'border-border'
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
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/90 via-card/55 to-transparent sm:via-card/40"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm',
              complete && healthy
                ? 'border-success/25 bg-success/10 text-success'
                : 'border-primary/25 bg-primary/10 text-primary'
            )}
          >
            <BadgeIcon className="h-3 w-3" aria-hidden="true" />
            {badgeLabel}
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {headline}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{subtext}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label={t('smartScan.hero.statHealth')} value={healthValue} />
            <StatPill label={t('smartScan.hero.statIssues')} value={issuesValue} />
            <StatPill label={reclaimLabel} value={reclaimValue} />
          </div>

          {/* Primary row: scan workflow actions only */}
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
          </div>

          {/* Secondary row: all screen destinations, uniform chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {navLinks.map((link) => (
              <JumpChip
                key={link.href}
                icon={link.icon}
                label={link.label}
                onClick={() => navigate(link.href)}
              />
            ))}
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
  icon: typeof Zap
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

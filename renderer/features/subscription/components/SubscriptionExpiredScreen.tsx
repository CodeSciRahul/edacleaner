import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Sparkles,
  Zap
} from 'lucide-react'
import { APP_NAME } from '@shared/constants'
import { formatBytes } from '@shared/utils'
import { Button } from '@/components/ui/Button'
import { loadReportsHistory } from '@/features/reports/lib/activity-history'
import { subscriptionService } from '@/features/subscription/services/subscription-service'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { electronService } from '@/services/electron-service'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'
import appIcon from '@/assets/app logo/App Icon1.svg'
import expiredHero from '@/assets/subscription/subscription-expired-hero.png'

function formatCompactCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  if (value < 1000) return String(Math.round(value))
  if (value < 1_000_000) {
    const k = value / 1000
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`
  }
  const m = value / 1_000_000
  return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')}M`
}

function formatStatsSince(isoOrMs: string | number | null, language: string): string | null {
  if (isoOrMs == null) return null
  const date = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs)
  if (Number.isNaN(date.getTime())) return null
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

interface SubscriptionExpiredScreenProps {
  isTrialExpired: boolean
  expiresAt: string | null
  statsSinceIso: string | null
}

/**
 * Full-window gate shown when paid access has lapsed.
 * Purchase opens the shared Plans modal (Pro / Premium); Maybe later continues on Free.
 */
export function SubscriptionExpiredScreen({
  isTrialExpired,
  expiresAt,
  statsSinceIso
}: SubscriptionExpiredScreenProps): React.ReactElement {
  const { t, language } = useTranslation()
  const navigate = useNavigate()
  const openPlansModal = useEntitlementsStore((s) => s.openPlansModal)
  const dismissExpiredGate = useEntitlementsStore((s) => s.dismissExpiredGate)
  const [syncing, setSyncing] = useState(false)

  const stats = useMemo(() => {
    const history = loadReportsHistory()
    const filesCleaned = history.entries.reduce((sum, entry) => {
      if (entry.kind === 'cleanup') return sum + entry.filesRemoved
      if (entry.kind === 'storage-delete') return sum + entry.deletedCount
      return sum + entry.itemsAffected
    }, 0)
    const oldest =
      history.entries.length > 0
        ? Math.min(...history.entries.map((e) => e.at))
        : null
    return {
      filesCleaned,
      bytesFreed: history.totals.bytesFreed,
      boostCount: history.totals.boostCount,
      sinceMs: oldest
    }
  }, [])

  const sinceLabel = formatStatsSince(statsSinceIso ?? stats.sinceMs, language)

  async function handleSync(): Promise<void> {
    if (syncing) return
    setSyncing(true)
    try {
      await subscriptionService.syncSubscriptionAfterPayment()
    } catch {
      // Session listener will refresh when sync succeeds later
    } finally {
      setSyncing(false)
    }
  }

  function handleMaybeLater(): void {
    dismissExpiredGate()
  }

  function handlePurchase(): void {
    openPlansModal()
  }

  function handleActivate(): void {
    void subscriptionService.openBillingPortal().catch(() => {
      openPlansModal()
    })
  }

  function goSettings(): void {
    dismissExpiredGate()
    navigate('/settings')
  }

  function goAbout(): void {
    dismissExpiredGate()
    navigate('/settings')
  }

  const footerDays = useMemo(() => {
    if (!expiresAt) return 0
    const end = new Date(expiresAt).getTime()
    if (Number.isNaN(end)) return 0
    const diff = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }, [expiresAt])

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[44px] z-40 flex flex-col overflow-hidden bg-[#0B1220] text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-expired-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(37,99,235,0.18),transparent_55%),radial-gradient(ellipse_at_80%_0%,rgba(6,182,212,0.12),transparent_45%)]"
      />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 px-6 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={appIcon}
            alt=""
            className="h-8 w-8 shrink-0 rounded-md object-contain shadow-sm"
            draggable={false}
          />
          <p className="truncate text-[15px] font-semibold tracking-tight text-white">
            {APP_NAME}
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-1 text-[13px] text-slate-300">
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            onClick={goSettings}
          >
            {t('subscription.expired.nav.settings')}
          </button>
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            onClick={() => {
              void electronService.app().openExternal('https://edacleaner.com')
            }}
          >
            {t('subscription.expired.nav.support')}
          </button>
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            onClick={handlePurchase}
          >
            {t('subscription.expired.nav.license')}
          </button>
          <button
            type="button"
            className="rounded-md px-2.5 py-1.5 transition-colors hover:bg-white/5 hover:text-white"
            onClick={goAbout}
          >
            {t('subscription.expired.nav.about')}
          </button>
          <button
            type="button"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
            aria-label={t('subscription.expired.nav.refresh')}
            disabled={syncing}
            onClick={() => void handleSync()}
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          </button>
        </nav>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-8 sm:px-10 lg:flex-row lg:items-center lg:gap-14">
          <div className="flex flex-1 justify-center lg:justify-start">
            <img
              src={expiredHero}
              alt={t('subscription.expired.artAlt')}
              className="h-auto w-full max-w-[420px] object-contain drop-shadow-2xl"
              draggable={false}
            />
          </div>

          <div className="flex flex-1 flex-col items-start">
            <h1
              id="subscription-expired-title"
              className="text-3xl font-semibold tracking-tight text-red-400 sm:text-4xl"
            >
              {isTrialExpired
                ? t('subscription.expired.title.trial')
                : t('subscription.expired.title.subscription')}
            </h1>
            <p className="mt-2 text-base text-slate-200 sm:text-lg">
              {t('subscription.expired.subtitle')}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="lg"
                className="h-11 min-w-[120px] rounded-lg bg-primary px-6 text-primary-foreground shadow-sm hover:bg-primary-hover"
                onClick={handlePurchase}
              >
                {t('subscription.expired.purchase')}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-11 min-w-[120px] rounded-lg border-slate-500 bg-transparent text-slate-100 hover:bg-white/5 hover:text-white"
                onClick={handleActivate}
              >
                {t('subscription.expired.activate')}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="h-11 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
                onClick={handleMaybeLater}
              >
                {t('subscription.expired.later')}
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl px-6 pb-10 sm:px-10">
          {sinceLabel ? (
            <p className="mb-5 text-center text-xs text-slate-500">
              {t('subscription.expired.statsSince', { date: sinceLabel })}
            </p>
          ) : (
            <p className="mb-5 text-center text-xs text-slate-500">
              {t('subscription.expired.statsLifetime')}
            </p>
          )}

          <div className="grid grid-cols-1 divide-y divide-slate-700/80 rounded-xl border border-slate-700/60 bg-slate-900/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatColumn
              icon={Sparkles}
              value={formatCompactCount(stats.filesCleaned)}
              label={t('subscription.expired.stat.files')}
            />
            <StatColumn
              icon={HardDrive}
              value={formatBytes(stats.bytesFreed, 1)}
              label={t('subscription.expired.stat.space')}
            />
            <StatColumn
              icon={Zap}
              value={formatCompactCount(stats.boostCount)}
              label={t('subscription.expired.stat.boosts')}
            />
          </div>
        </section>
      </div>

      <footer className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 bg-slate-900/90 px-6 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5 text-sm text-slate-200">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/90 text-slate-950">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden="true" />
          </span>
          <p className="truncate">
            {isTrialExpired
              ? t('subscription.expired.footer.trial', { days: footerDays })
              : t('subscription.expired.footer.subscription')}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-lg bg-primary px-4 text-primary-foreground hover:bg-primary-hover"
          onClick={handlePurchase}
        >
          {t('subscription.expired.footer.buy')}
        </Button>
      </footer>
    </div>
  )
}

function StatColumn({
  icon: Icon,
  value,
  label
}: {
  icon: typeof Sparkles
  value: string
  label: string
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
      <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="text-sm text-slate-300">{label}</p>
    </div>
  )
}

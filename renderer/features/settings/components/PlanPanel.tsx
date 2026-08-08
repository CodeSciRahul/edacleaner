import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  ExternalLink,
  FileText,
  History,
  RefreshCw,
  Sparkles,
  Wallet
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { SettingsInfoRow } from '@/features/settings/components/SettingsRow'
import { authService, type CachedSubscription } from '@/services/auth-service'
import {
  subscriptionService,
  type SubscriptionHistoryEvent,
  type SubscriptionInvoice
} from '@/features/subscription/services/subscription-service'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { cn } from '@/utils/cn'
import { electronService } from '@/services/electron-service'

type PlanSlug = 'free' | 'pro' | 'premium' | string

interface SubscriptionPayload {
  subscription: CachedSubscription | null
  plan: string
  expiry: string | null
  features: string[]
  trial: { isTrialing: boolean; trialEnd: string | null }
}

const FEATURE_PREVIEW = 5
const INVOICE_PREVIEW = 5
const HISTORY_PREVIEW = 6

function normalizePlan(plan: string | null | undefined): PlanSlug {
  const value = (plan ?? 'free').trim().toLowerCase()
  if (value === 'pro' || value === 'premium' || value === 'free') return value
  return value || 'free'
}

function planLabelKey(plan: PlanSlug): TranslationKey {
  if (plan === 'pro') return 'settings.plan.name.pro'
  if (plan === 'premium') return 'settings.plan.name.premium'
  if (plan === 'free') return 'settings.plan.name.free'
  return 'settings.plan.name.unknown'
}

function statusLabelKey(status: string): TranslationKey {
  switch (status) {
    case 'active':
      return 'settings.plan.status.active'
    case 'trialing':
      return 'settings.plan.status.trialing'
    case 'canceled':
      return 'settings.plan.status.canceled'
    case 'past_due':
      return 'settings.plan.status.pastDue'
    case 'incomplete':
      return 'settings.plan.status.incomplete'
    case 'incomplete_expired':
      return 'settings.plan.status.incompleteExpired'
    case 'unpaid':
      return 'settings.plan.status.unpaid'
    default:
      return 'settings.plan.status.unknown'
  }
}

function invoiceStatusKey(status: string | null): TranslationKey {
  switch ((status ?? '').toLowerCase()) {
    case 'paid':
      return 'settings.plan.invoice.paid'
    case 'open':
      return 'settings.plan.invoice.open'
    case 'draft':
      return 'settings.plan.invoice.draft'
    case 'void':
      return 'settings.plan.invoice.void'
    case 'uncollectible':
      return 'settings.plan.invoice.uncollectible'
    default:
      return 'settings.plan.invoice.unknown'
  }
}

function formatDate(iso: string | null | undefined, language: string): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium'
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleDateString()
  }
}

function formatDateTime(iso: string | null | undefined, language: string): string {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString()
  }
}

function formatMoney(cents: number, currency: string, language: string): string {
  const amount = (Number.isFinite(cents) ? cents : 0) / 100
  try {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${(currency || 'usd').toUpperCase()}`
  }
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24))
}

export function PlanPanel(): React.ReactElement {
  const { t, language } = useTranslation()
  const openPlansModal = useEntitlementsStore((s) => s.openPlansModal)
  const [data, setData] = useState<SubscriptionPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([])
  const [history, setHistory] = useState<SubscriptionHistoryEvent[]>([])
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [featuresExpanded, setFeaturesExpanded] = useState(false)
  const [invoicesExpanded, setInvoicesExpanded] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [online, setOnline] = useState(true)

  const applySessionSub = useCallback((sub: CachedSubscription | null) => {
    setData({
      subscription: sub,
      plan: sub?.currentPlan ?? 'free',
      expiry: sub?.expiresAt ?? null,
      features: sub?.features ?? [],
      trial: {
        isTrialing: sub?.isTrialing ?? false,
        trialEnd: sub?.trialEnd ?? null
      }
    })
  }, [])

  const loadBilling = useCallback(async () => {
    setBillingLoading(true)
    setBillingError(null)
    try {
      const [nextInvoices, nextHistory] = await Promise.all([
        subscriptionService.listInvoices(),
        subscriptionService.listHistory()
      ])
      setInvoices(nextInvoices)
      setHistory(nextHistory)
    } catch (err) {
      const mapped = subscriptionService.mapError(err)
      setBillingError(
        mapped.offline
          ? t('settings.plan.billingOffline')
          : mapped.message || t('settings.plan.billingError')
      )
    } finally {
      setBillingLoading(false)
    }
  }, [t])

  const load = useCallback(
    async (opts?: { sync?: boolean }) => {
      const isSync = opts?.sync === true
      if (isSync) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        if (isSync) {
          await authService.sync('settings-plan-refresh').catch(() => null)
        }
        const next = await authService.getSubscription()
        setData(next)
        void loadBilling()
      } catch {
        setError(t('settings.plan.loadError'))
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [loadBilling, t]
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return authService.onSessionChanged((event) => {
      applySessionSub(event.session.subscription)
    })
  }, [applySessionSub])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const status = await electronService.offline().getNetworkStatus()
        if (!cancelled) setOnline(Boolean(status.online))
      } catch {
        if (!cancelled) setOnline(true)
      }
    })()
    const unsub = electronService.offline().onNetworkStatusChanged((status) => {
      setOnline(Boolean(status.online))
      if (status.online) void loadBilling()
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [loadBilling])

  const plan = normalizePlan(data?.plan ?? data?.subscription?.currentPlan)
  const status = data?.subscription?.status ?? (data ? 'unknown' : '—')
  const features = data?.features?.length
    ? data.features
    : (data?.subscription?.features ?? [])
  const isTrialing = data?.trial.isTrialing ?? data?.subscription?.isTrialing ?? false
  const hasAccess = data?.subscription?.hasActiveAccess ?? plan === 'free'
  const isPaid = data?.subscription?.isPaid ?? (plan === 'pro' || plan === 'premium')
  const pendingPlan = data?.subscription?.pendingPlan
  const cancelAtPeriodEnd = data?.subscription?.cancelAtPeriodEnd ?? false
  const periodStart = data?.subscription?.currentPeriodStart ?? null
  const periodEnd = data?.subscription?.currentPeriodEnd ?? null
  const trialEnd = data?.trial.trialEnd ?? data?.subscription?.trialEnd ?? null
  const billingInterval = data?.subscription?.billingInterval ?? null

  const planTitle = loading ? '…' : t(planLabelKey(plan))
  const statusValue = loading
    ? '…'
    : typeof status === 'string' && status !== '—'
      ? t(statusLabelKey(status))
      : '—'

  const renewalIso = isTrialing ? trialEnd : periodEnd
  const daysLeft = daysUntil(renewalIso)

  const renewalHeadline = useMemo(() => {
    if (loading) return t('settings.plan.loading')
    if (plan === 'free') return t('settings.plan.renewal.free')
    if (isTrialing && trialEnd) {
      return t('settings.plan.renewal.trialEnds', { date: formatDate(trialEnd, language) })
    }
    if (cancelAtPeriodEnd && periodEnd) {
      return t('settings.plan.renewal.ends', { date: formatDate(periodEnd, language) })
    }
    if (periodEnd) {
      return t('settings.plan.renewal.renews', { date: formatDate(periodEnd, language) })
    }
    return t('settings.plan.renewal.unknown')
  }, [
    cancelAtPeriodEnd,
    isTrialing,
    language,
    loading,
    periodEnd,
    plan,
    t,
    trialEnd
  ])

  const visibleFeatures = featuresExpanded ? features : features.slice(0, FEATURE_PREVIEW)
  const visibleInvoices = invoicesExpanded ? invoices : invoices.slice(0, INVOICE_PREVIEW)
  const visibleHistory = historyExpanded ? history : history.slice(0, HISTORY_PREVIEW)

  const openInvoice = async (invoice: SubscriptionInvoice): Promise<void> => {
    const url = invoice.hostedInvoiceUrl || invoice.invoicePdf
    if (!url) return
    await subscriptionService.openCheckoutUrl(url)
  }

  const openPortal = async (): Promise<void> => {
    if (!isPaid) {
      openPlansModal()
      return
    }
    setPortalBusy(true)
    try {
      await subscriptionService.openBillingPortal()
    } catch (err) {
      const mapped = subscriptionService.mapError(err)
      setBillingError(mapped.message || t('settings.plan.portalError'))
    } finally {
      setPortalBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <SettingsSection
        icon={Crown}
        title={t('settings.plan.title')}
        description={t('settings.plan.description')}
        action={
          <Badge
            variant={plan === 'free' ? 'secondary' : 'default'}
            className="rounded-md capitalize"
          >
            {planTitle}
          </Badge>
        }
      >
        <div
          className={cn(
            'mb-5 overflow-hidden rounded-2xl border',
            plan === 'premium'
              ? 'border-primary/25 bg-primary/[0.06]'
              : plan === 'pro'
                ? 'border-primary/15 bg-primary/[0.04]'
                : 'border-border bg-muted/20'
          )}
        >
          <div className="flex flex-wrap items-start gap-4 p-4 sm:p-5">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl shadow-sm',
                plan === 'free'
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {plan === 'free' ? (
                <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Crown className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-foreground">
                  {loading ? '…' : t('settings.plan.current', { plan: planTitle })}
                </p>
                <Badge variant="outline" className="rounded-md capitalize">
                  {statusValue}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-foreground/90">{renewalHeadline}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {loading
                  ? t('settings.plan.loading')
                  : isTrialing
                    ? t('settings.plan.trialHint')
                    : hasAccess
                      ? t('settings.plan.accessActive')
                      : t('settings.plan.accessInactive')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {plan !== 'premium' ? (
                <Button size="sm" className="h-9 rounded-lg" onClick={openPlansModal}>
                  {t('settings.plan.upgrade')}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 rounded-lg"
                disabled={portalBusy || loading || (!isPaid && !online)}
                onClick={() => void openPortal()}
              >
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                {portalBusy
                  ? t('settings.plan.portalOpening')
                  : isPaid
                    ? t('settings.plan.manageBilling')
                    : t('settings.plan.viewPlans')}
              </Button>
            </div>
          </div>

          <div className="grid gap-px border-t border-border/70 bg-border/60 sm:grid-cols-3">
            <MetricCell
              label={t('settings.plan.billingCycle')}
              value={
                loading
                  ? '…'
                  : plan === 'free'
                    ? t('settings.plan.cycle.none')
                    : billingInterval === 'year'
                      ? t('settings.plan.cycle.year')
                      : t('settings.plan.cycle.month')
              }
            />
            <MetricCell
              label={
                cancelAtPeriodEnd
                  ? t('settings.plan.accessUntil')
                  : isTrialing
                    ? t('settings.plan.trialEnds')
                    : t('settings.plan.nextRenewal')
              }
              value={loading ? '…' : formatDate(renewalIso, language)}
            />
            <MetricCell
              label={t('settings.plan.daysRemaining')}
              value={
                loading
                  ? '…'
                  : daysLeft == null
                    ? '—'
                    : daysLeft < 0
                      ? t('settings.plan.ended')
                      : t('settings.plan.daysLeft', { count: daysLeft })
              }
            />
          </div>
        </div>

        <div className="space-y-1">
          <SettingsInfoRow label={t('settings.plan.plan')} value={planTitle} />
          <SettingsInfoRow label={t('settings.plan.statusLabel')} value={statusValue} />
          {periodStart ? (
            <SettingsInfoRow
              label={t('settings.plan.periodStarts')}
              value={loading ? '…' : formatDate(periodStart, language)}
            />
          ) : null}
          {periodEnd ? (
            <SettingsInfoRow
              label={
                cancelAtPeriodEnd
                  ? t('settings.plan.accessUntil')
                  : t('settings.plan.periodEnds')
              }
              value={loading ? '…' : formatDate(periodEnd, language)}
            />
          ) : null}
          {pendingPlan ? (
            <SettingsInfoRow
              label={t('settings.plan.pending')}
              value={t(planLabelKey(normalizePlan(pendingPlan)))}
            />
          ) : null}
          {cancelAtPeriodEnd ? (
            <SettingsInfoRow
              label={t('settings.plan.cancelScheduled')}
              value={t('settings.plan.yes')}
            />
          ) : null}
        </div>

        <Separator className="my-4" />

        <div className="px-1">
          <p className="text-sm font-medium text-foreground">{t('settings.plan.features')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('settings.plan.featuresDesc')}
          </p>

          {loading ? (
            <p className="mt-3 text-xs text-muted-foreground">{t('settings.plan.loading')}</p>
          ) : features.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">{t('settings.plan.noFeatures')}</p>
          ) : (
            <>
              <ul className="mt-3 space-y-1.5">
                {visibleFeatures.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground"
                  >
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {features.length > FEATURE_PREVIEW ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-8 gap-1 px-2 text-xs"
                  onClick={() => setFeaturesExpanded((v) => !v)}
                >
                  {featuresExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {featuresExpanded
                    ? t('settings.plan.showLess')
                    : t('settings.plan.showMore', {
                        count: features.length - FEATURE_PREVIEW
                      })}
                </Button>
              ) : null}
            </>
          )}
        </div>

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="text-xs text-muted-foreground">{t('settings.plan.refreshHint')}</p>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-lg"
            onClick={() => void load({ sync: true })}
            disabled={refreshing || loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {refreshing ? t('settings.plan.refreshing') : t('settings.plan.refresh')}
          </Button>
        </div>

        {error ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection
        icon={FileText}
        title={t('settings.plan.invoicesTitle')}
        description={t('settings.plan.invoicesDesc')}
      >
        {billingLoading && invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('settings.plan.billingLoading')}</p>
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <FileText className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {t('settings.plan.invoicesEmpty')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.plan.invoicesEmptyHint')}
            </p>
            {plan === 'free' ? (
              <Button size="sm" className="mt-4 h-9" onClick={openPlansModal}>
                {t('settings.plan.upgrade')}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleInvoices.map((invoice) => {
              const amount =
                typeof invoice.displayAmount === 'number' && invoice.displayAmount > 0
                  ? invoice.displayAmount
                  : invoice.amountPaid > 0
                    ? invoice.amountPaid
                    : invoice.total && invoice.total > 0
                      ? invoice.total
                      : invoice.amountDue > 0
                        ? invoice.amountDue
                        : 0
              const canOpen = Boolean(invoice.hostedInvoiceUrl || invoice.invoicePdf)
              const isTrial = Boolean(invoice.isTrialInvoice) && amount === 0
              return (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-background/60 px-3.5 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {isTrial
                          ? t('settings.plan.invoice.trialAmount')
                          : formatMoney(amount, invoice.currency, language)}
                      </p>
                      <Badge variant="secondary" className="rounded-md capitalize">
                        {t(invoiceStatusKey(invoice.status))}
                      </Badge>
                      {isTrial ? (
                        <Badge variant="outline" className="rounded-md">
                          {t('settings.plan.invoice.trial')}
                        </Badge>
                      ) : null}
                      {invoice.number ? (
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {invoice.number}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {isTrial
                        ? t('settings.plan.invoice.trialHint')
                        : formatDate(invoice.paidAt ?? invoice.created, language)}
                      {!isTrial && invoice.periodStart && invoice.periodEnd
                        ? ` · ${formatDate(invoice.periodStart, language)} – ${formatDate(invoice.periodEnd, language)}`
                        : ''}
                      {invoice.description ? ` · ${invoice.description}` : ''}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-lg"
                    disabled={!canOpen}
                    onClick={() => void openInvoice(invoice)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('settings.plan.viewInvoice')}
                  </Button>
                </div>
              )
            })}
            {invoices.length > INVOICE_PREVIEW ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
                onClick={() => setInvoicesExpanded((v) => !v)}
              >
                {invoicesExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {invoicesExpanded
                  ? t('settings.plan.showLess')
                  : t('settings.plan.showMore', {
                      count: invoices.length - INVOICE_PREVIEW
                    })}
              </Button>
            ) : null}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        icon={History}
        title={t('settings.plan.historyTitle')}
        description={t('settings.plan.historyDesc')}
      >
        {billingLoading && history.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('settings.plan.billingLoading')}</p>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
            <History className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-foreground">
              {t('settings.plan.historyEmpty')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('settings.plan.historyEmptyHint')}
            </p>
          </div>
        ) : (
          <div className="relative space-y-0 pl-2">
            <div
              className="absolute bottom-2 left-[15px] top-2 w-px bg-border"
              aria-hidden="true"
            />
            {visibleHistory.map((event) => (
              <div key={event.id} className="relative flex gap-3 py-2.5">
                <div className="relative z-[1] mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-card" />
                <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{event.message}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {formatDateTime(event.createdAt, language)}
                    </p>
                  </div>
                  {(event.fromPlan || event.toPlan) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.fromPlan
                        ? t(planLabelKey(normalizePlan(event.fromPlan)))
                        : '—'}
                      {' → '}
                      {event.toPlan
                        ? t(planLabelKey(normalizePlan(event.toPlan)))
                        : '—'}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {history.length > HISTORY_PREVIEW ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-5 h-8 gap-1 px-2 text-xs"
                onClick={() => setHistoryExpanded((v) => !v)}
              >
                {historyExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                {historyExpanded
                  ? t('settings.plan.showLess')
                  : t('settings.plan.showMore', {
                      count: history.length - HISTORY_PREVIEW
                    })}
              </Button>
            ) : null}
          </div>
        )}

        {billingError ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            {billingError}
          </p>
        ) : null}
      </SettingsSection>
    </div>
  )
}

function MetricCell({
  label,
  value
}: {
  label: string
  value: string
}): React.ReactElement {
  return (
    <div className="bg-card/80 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

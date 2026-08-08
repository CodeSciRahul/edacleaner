import { useCallback, useEffect, useState } from 'react'
import { Check, Crown, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { SettingsInfoRow } from '@/features/settings/components/SettingsRow'
import { authService, type CachedSubscription } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { cn } from '@/utils/cn'

type PlanSlug = 'free' | 'pro' | 'premium' | string

interface SubscriptionPayload {
  subscription: CachedSubscription | null
  plan: string
  expiry: string | null
  features: string[]
  trial: { isTrialing: boolean; trialEnd: string | null }
}

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

function formatDate(iso: string | null | undefined, language: string): string {
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

export function PlanPanel(): React.ReactElement {
  const { t, language } = useTranslation()
  const [data, setData] = useState<SubscriptionPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: { sync?: boolean }) => {
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
    } catch {
      setError(t('settings.plan.loadError'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return authService.onSessionChanged((event) => {
      const sub = event.session.subscription
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
    })
  }, [])

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
  const periodEnd = data?.subscription?.currentPeriodEnd ?? null
  const trialEnd = data?.trial.trialEnd ?? data?.subscription?.trialEnd ?? null
  const expiry = data?.expiry ?? data?.subscription?.expiresAt ?? null

  const planTitle = loading ? '…' : t(planLabelKey(plan))
  const statusValue = loading
    ? '…'
    : typeof status === 'string' && status !== '—'
      ? t(statusLabelKey(status))
      : '—'

  return (
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
      <div className="space-y-1">
        <div
          className={cn(
            'mb-4 flex items-center gap-3 rounded-xl border px-4 py-3.5',
            plan === 'premium'
              ? 'border-primary/25 bg-primary/[0.06]'
              : plan === 'pro'
                ? 'border-primary/15 bg-primary/[0.04]'
                : 'border-border bg-muted/20'
          )}
        >
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl shadow-sm',
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
            <p className="text-sm font-semibold text-foreground">
              {loading ? '…' : t('settings.plan.current', { plan: planTitle })}
            </p>
            <p className="text-xs text-muted-foreground">
              {loading
                ? t('settings.plan.loading')
                : isTrialing
                  ? t('settings.plan.trialHint')
                  : hasAccess
                    ? t('settings.plan.accessActive')
                    : t('settings.plan.accessInactive')}
            </p>
          </div>
        </div>

        <SettingsInfoRow label={t('settings.plan.plan')} value={planTitle} />
        <SettingsInfoRow label={t('settings.plan.statusLabel')} value={statusValue} />
        <SettingsInfoRow
          label={t('settings.plan.access')}
          value={
            loading
              ? '…'
              : hasAccess
                ? t('settings.plan.yes')
                : t('settings.plan.no')
          }
        />
        <SettingsInfoRow
          label={t('settings.plan.paid')}
          value={
            loading ? '…' : isPaid ? t('settings.plan.yes') : t('settings.plan.no')
          }
        />
        {isTrialing || trialEnd ? (
          <SettingsInfoRow
            label={t('settings.plan.trialEnds')}
            value={loading ? '…' : formatDate(trialEnd, language)}
          />
        ) : null}
        {periodEnd ? (
          <SettingsInfoRow
            label={t('settings.plan.periodEnds')}
            value={loading ? '…' : formatDate(periodEnd, language)}
          />
        ) : null}
        {expiry && expiry !== periodEnd && expiry !== trialEnd ? (
          <SettingsInfoRow
            label={t('settings.plan.expires')}
            value={loading ? '…' : formatDate(expiry, language)}
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
            <ul className="mt-3 space-y-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 text-sm text-foreground"
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
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive animate-in fade-in-0 duration-200"
          >
            {error}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  )
}

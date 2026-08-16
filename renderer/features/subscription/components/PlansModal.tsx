import { useEffect } from 'react'
import { Loader2, RefreshCw, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PlanCard } from '@/features/subscription/components/PlanCard'
import { usePlansModal } from '@/features/subscription/hooks/usePlansModal'
import { normalizePlanSlug, type BillingInterval } from '@/features/subscription/lib/plans'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface PlansModalProps {
  open: boolean
  onClose: () => void
  onUnauthorized?: () => void
  onSubscriptionUpdated?: () => void
}

function BillingToggle({
  value,
  onChange,
  label,
  monthlyLabel,
  yearlyLabel,
  saveBadge
}: {
  value: BillingInterval
  onChange: (next: BillingInterval) => void
  label: string
  monthlyLabel: string
  yearlyLabel: string
  saveBadge: string
}): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex rounded-xl border border-border/80 bg-muted/50 p-1"
    >
      {(['month', 'year'] as const).map((interval) => {
        const active = value === interval
        return (
          <button
            key={interval}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(interval)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {interval === 'month' ? monthlyLabel : yearlyLabel}
            {interval === 'year' ? (
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary/90'
                )}
              >
                {saveBadge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function PlansModal({
  open,
  onClose,
  onUnauthorized,
  onSubscriptionUpdated
}: PlansModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const {
    plans,
    currentPlan,
    currentInterval,
    billingInterval,
    setBillingInterval,
    pendingPlan,
    loadingPlans,
    actionPlanId,
    error,
    feedback,
    online,
    reload,
    selectPlan
  } = usePlansModal({ open, onUnauthorized, onSubscriptionUpdated })

  useEffect(() => {
    if (feedback?.type !== 'upgraded') return
    const timer = window.setTimeout(() => {
      onClose()
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [feedback, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !actionPlanId) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, actionPlanId])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/75 backdrop-blur-sm"
        aria-label={t('common.close')}
        onClick={() => {
          if (!actionPlanId) onClose()
        }}
      />

      <div
        className={cn(
          'relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col',
          'overflow-hidden rounded-2xl border border-border bg-card shadow-card',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        <div className="flex flex-col gap-4 border-b border-border/70 bg-gradient-to-br from-muted/30 via-card to-primary/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0 pr-8 sm:pr-0">
            <h2 id="plans-modal-title" className="text-lg font-semibold tracking-tight text-foreground">
              {t('plans.title')}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
              {t('plans.description')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <BillingToggle
              value={billingInterval}
              onChange={setBillingInterval}
              label={t('plans.billing.label')}
              monthlyLabel={t('plans.billing.monthly')}
              yearlyLabel={t('plans.billing.yearly')}
              saveBadge={t('plans.billing.saveBadge')}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-xl"
              onClick={onClose}
              disabled={Boolean(actionPlanId)}
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {!online ? (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground"
            >
              <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <p>{t('plans.offlineNotice')}</p>
            </div>
          ) : null}

          {feedback?.type === 'checkout-opened' ? (
            <p
              role="status"
              className="mb-4 rounded-xl border border-primary/25 bg-primary/[0.05] px-3 py-2.5 text-xs text-foreground"
            >
              {t('plans.feedback.checkoutOpened')}
            </p>
          ) : null}
          {feedback?.type === 'upgraded' ? (
            <p
              role="status"
              className="mb-4 rounded-xl border border-primary/25 bg-primary/[0.05] px-3 py-2.5 text-xs text-foreground"
            >
              {t('plans.feedback.updated')}
            </p>
          ) : null}
          {feedback?.type === 'downgrade-scheduled' ? (
            <p
              role="status"
              className="mb-4 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs text-foreground"
            >
              {t('plans.feedback.downgradeScheduled')}
            </p>
          ) : null}

          {error ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 rounded-lg"
                onClick={() => void reload()}
                disabled={loadingPlans || Boolean(actionPlanId)}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingPlans ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {t('common.retry')}
              </Button>
            </div>
          ) : null}

          {loadingPlans && plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              {t('plans.loading')}
            </div>
          ) : (
            <div className="grid items-stretch gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlan={currentPlan}
                  currentInterval={currentInterval}
                  pendingPlan={pendingPlan}
                  online={online}
                  busy={actionPlanId === plan.id}
                  disabled={Boolean(actionPlanId) && actionPlanId !== plan.id}
                  recommended={normalizePlanSlug(plan.slug) === 'premium'}
                  onSelect={(selected) => void selectPlan(selected)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

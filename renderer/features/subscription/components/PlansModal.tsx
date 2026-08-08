import { useEffect } from 'react'
import { Loader2, RefreshCw, WifiOff, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PlanCard } from '@/features/subscription/components/PlanCard'
import { usePlansModal } from '@/features/subscription/hooks/usePlansModal'
import { normalizePlanSlug } from '@/features/subscription/lib/plans'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface PlansModalProps {
  open: boolean
  onClose: () => void
}

export function PlansModal({ open, onClose }: PlansModalProps): React.ReactElement | null {
  const { t } = useTranslation()
  const {
    plans,
    currentPlan,
    pendingPlan,
    loadingPlans,
    actionPlanId,
    error,
    feedback,
    online,
    reload,
    selectPlan
  } = usePlansModal({ open })

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
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        aria-label={t('common.close')}
        onClick={() => {
          if (!actionPlanId) onClose()
        }}
      />

      <div
        className={cn(
          'relative z-10 flex max-h-[min(90vh,880px)] w-full max-w-4xl flex-col',
          'overflow-hidden rounded-2xl border border-border bg-card shadow-card',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2
              id="plans-modal-title"
              className="text-section-title text-foreground"
            >
              {t('plans.title')}
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t('plans.description')}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            disabled={Boolean(actionPlanId)}
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </Button>
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
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlan={currentPlan}
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

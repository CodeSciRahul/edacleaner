import { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { PLAN_DISPLAY_NAMES, type PlanSlug } from '@shared/entitlements'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { useTranslation } from '@/i18n/useTranslation'

/**
 * Global success dialog after an immediate upgrade / checkout return.
 * Hosted outside PlansModal so shortcut upgrade CTAs also surface feedback.
 */
export function PlanChangeSuccessModal(): React.ReactElement | null {
  const { t } = useTranslation()
  const success = useEntitlementsStore((s) => s.planChangeSuccess)
  const clearPlanChangeSuccess = useEntitlementsStore((s) => s.clearPlanChangeSuccess)

  useEffect(() => {
    if (!success) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') clearPlanChangeSuccess()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [success, clearPlanChangeSuccess])

  if (!success) return null

  const planLabel =
    PLAN_DISPLAY_NAMES[success.plan as PlanSlug] ??
    success.plan.charAt(0).toUpperCase() + success.plan.slice(1)

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
        aria-label={t('common.close')}
        onClick={clearPlanChangeSuccess}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-success-title"
        className="relative z-[1] w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/12 to-transparent" />

        <div className="relative flex items-start justify-end px-4 pt-3">
          <button
            type="button"
            onClick={clearPlanChangeSuccess}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="relative flex flex-col items-center px-6 pb-6 pt-1 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2
            id="plan-success-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {t('plans.success.title', { plan: planLabel })}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t('plans.success.body', { plan: planLabel })}
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-5 h-9 min-w-[7.5rem]"
            onClick={clearPlanChangeSuccess}
          >
            {t('plans.success.dismiss')}
          </Button>
        </div>
      </div>
    </div>
  )
}

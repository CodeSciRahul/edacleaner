import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import {
  INTRO_STEPS,
  type OnboardingStep
} from '@/features/onboarding/store/onboarding-store'
import { ProductStage, type ProductStageVariant } from '@/features/onboarding/components/ProductStage'

interface OnboardingShellProps {
  step: OnboardingStep
  titleId: string
  children: React.ReactNode
  footer: React.ReactNode
}

function introIndex(step: OnboardingStep): number {
  if (step === 'account' || step === 'ready') return INTRO_STEPS.indexOf('license')
  return Math.max(0, INTRO_STEPS.indexOf(step))
}

export function OnboardingShell({
  step,
  titleId,
  children,
  footer
}: OnboardingShellProps): React.ReactElement {
  const { t } = useTranslation()
  const active = introIndex(step)
  const stageVariant: ProductStageVariant =
    step === 'account' || step === 'ready' ? 'license' : (step as ProductStageVariant)

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background">
      <section
        className={cn(
          'relative flex w-[46%] min-w-[340px] items-center justify-center overflow-hidden',
          'border-r border-border bg-sidebar px-8 py-10'
        )}
        aria-hidden="true"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)_/_0.08),transparent_55%)]"
        />
        <ProductStage variant={stageVariant} />
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-center gap-1.5 px-6 pt-5" role="group" aria-label={t('onboarding.progressNav')}>
          <span className="sr-only">
            {t('onboarding.progress', { current: active + 1, total: INTRO_STEPS.length })}
          </span>
          {INTRO_STEPS.map((id, index) => (
            <span
              key={id}
              className={cn(
                'h-1 rounded-full transition-all duration-200',
                index === active ? 'w-6 bg-primary' : index < active ? 'w-3 bg-primary/50' : 'w-3 bg-border'
              )}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-6 sm:px-10">
          <div
            key={step}
            className="mx-auto flex min-h-full max-w-md flex-col justify-center animate-in fade-in-0 slide-in-from-right-2 duration-200"
          >
            <div id={titleId}>{children}</div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-border bg-card/60 px-6 py-4 sm:px-10">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3">{footer}</div>
        </footer>
      </section>
    </div>
  )
}

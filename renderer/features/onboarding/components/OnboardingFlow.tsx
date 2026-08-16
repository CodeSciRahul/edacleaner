import { useEffect, useId } from 'react'
import { ArrowLeft, ArrowRight, Check, CreditCard, KeyRound, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { AuthForm } from '@/features/auth/components/AuthForm'
import { OnboardingShell } from '@/features/onboarding/components/OnboardingShell'
import {
  INTRO_STEPS,
  useOnboardingStore,
  type AuthIntent,
  type OnboardingStep
} from '@/features/onboarding/store/onboarding-store'
import { PlansModal } from '@/features/subscription/components/PlansModal'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { useTranslation } from '@/i18n/useTranslation'
import { cn } from '@/utils/cn'

interface OnboardingFlowProps {
  authenticated: boolean
  session: AuthSessionSnapshot | null
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
}

function planLabel(session: AuthSessionSnapshot | null, fallback: string): string {
  const plan = session?.subscription?.currentPlan?.trim()
  if (!plan) return fallback
  return plan.charAt(0).toUpperCase() + plan.slice(1)
}

export function OnboardingFlow({
  authenticated,
  session,
  onLogin,
  onRegister
}: OnboardingFlowProps): React.ReactElement {
  const titleId = useId()
  const step = useOnboardingStore((s) => s.step)
  const authIntent = useOnboardingStore((s) => s.authIntent)
  const plansOpen = useOnboardingStore((s) => s.plansOpen)
  const setStep = useOnboardingStore((s) => s.setStep)
  const nextIntro = useOnboardingStore((s) => s.nextIntro)
  const back = useOnboardingStore((s) => s.back)
  const startActivate = useOnboardingStore((s) => s.startActivate)
  const startPurchase = useOnboardingStore((s) => s.startPurchase)
  const beginAccount = useOnboardingStore((s) => s.beginAccount)
  const openPlans = useOnboardingStore((s) => s.openPlans)
  const closePlans = useOnboardingStore((s) => s.closePlans)
  const complete = useOnboardingStore((s) => s.complete)
  const completed = useOnboardingStore((s) => s.completed)
  const canGoBack = step !== 'welcome' && !(completed && step === 'license')

  useEffect(() => {
    if (authenticated && step === 'account') {
      if (authIntent === 'purchase') {
        setStep('license')
        openPlans()
        return
      }
      setStep('ready')
    }
  }, [authenticated, authIntent, openPlans, setStep, step])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (event.key === 'Escape' && plansOpen) {
        event.preventDefault()
        closePlans()
        return
      }

      if (typing || plansOpen) return

      if (event.key === 'Enter' && INTRO_STEPS.includes(step) && step !== 'license') {
        event.preventDefault()
        nextIntro()
        return
      }

      if (event.key === 'ArrowRight' && INTRO_STEPS.includes(step) && step !== 'license') {
        event.preventDefault()
        nextIntro()
        return
      }

      if ((event.key === 'ArrowLeft' || event.key === 'Backspace') && step !== 'welcome') {
        if (completed && step === 'license') return
        event.preventDefault()
        back()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [back, closePlans, completed, nextIntro, plansOpen, step])

  function handleAuthenticated(_next: AuthSessionSnapshot): void {
    if (authIntent === 'purchase') {
      setStep('license')
      openPlans()
      return
    }
    setStep('ready')
  }

  return (
    <div
      className="h-full min-h-0 w-full"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <OnboardingShell
        step={step}
        titleId={titleId}
        footer={
          <OnboardingFooter
            step={step}
            canGoBack={canGoBack}
            onBack={back}
            onContinue={nextIntro}
            onFinish={complete}
          />
        }
      >
        <OnboardingBody
          step={step}
          authenticated={authenticated}
          authIntent={authIntent}
          session={session}
          onLogin={onLogin}
          onRegister={onRegister}
          onAuthenticated={handleAuthenticated}
          onActivate={startActivate}
          onBuyLicense={startPurchase}
          onContinueAuthenticated={() => setStep('ready')}
        />
      </OnboardingShell>

      <PlansModal
        open={plansOpen}
        onClose={closePlans}
        onUnauthorized={() => {
          beginAccount('purchase')
        }}
        onSubscriptionUpdated={() => {
          closePlans()
          setStep('ready')
        }}
      />
    </div>
  )
}

function OnboardingBody({
  step,
  authenticated,
  authIntent,
  session,
  onLogin,
  onRegister,
  onAuthenticated,
  onActivate,
  onBuyLicense,
  onContinueAuthenticated
}: {
  step: OnboardingStep
  authenticated: boolean
  authIntent: AuthIntent
  session: AuthSessionSnapshot | null
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onAuthenticated: (session: AuthSessionSnapshot) => void
  onActivate: () => void
  onBuyLicense: () => void
  onContinueAuthenticated: () => void
}): React.ReactElement {
  const { t } = useTranslation()

  if (step === 'welcome') {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t('onboarding.welcome.eyebrow')}
        </p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {t('onboarding.welcome.title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('onboarding.welcome.body')}
        </p>
        <ul className="mt-5 space-y-2 text-[13px] text-foreground">
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
            {t('onboarding.welcome.point1')}
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
            {t('onboarding.welcome.point2')}
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
            {t('onboarding.welcome.point3')}
          </li>
        </ul>
      </>
    )
  }

  if (step === 'value') {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t('onboarding.value.eyebrow')}
        </p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {t('onboarding.value.title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('onboarding.value.body')}</p>
        <div className="mt-5 space-y-3">
          {[
            t('onboarding.value.point1'),
            t('onboarding.value.point2'),
            t('onboarding.value.point3')
          ].map((text) => (
            <p
              key={text}
              className="rounded-lg border border-border bg-muted/20 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground"
            >
              {text}
            </p>
          ))}
        </div>
      </>
    )
  }

  if (step === 'features') {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t('onboarding.features.eyebrow')}
        </p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {t('onboarding.features.title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('onboarding.features.body')}
        </p>
        <div className="mt-5 space-y-3">
          <FeatureRow title={t('nav.smartScan')} body={t('onboarding.features.smartScan')} />
          <FeatureRow title={t('nav.cleanup')} body={t('onboarding.features.cleanup')} />
          <FeatureRow title={t('nav.performance')} body={t('onboarding.features.performance')} />
        </div>
      </>
    )
  }

  if (step === 'license') {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {t('onboarding.license.eyebrow')}
        </p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-foreground">
          {t('onboarding.license.title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('onboarding.license.body')}</p>
        <div className="mt-6 space-y-2.5">
          {authenticated ? (
            <Button type="button" className="h-11 w-full justify-between gap-3 px-4" onClick={onContinueAuthenticated}>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                {t('common.continue')}
              </span>
              <ArrowRight className="h-4 w-4 opacity-80" />
            </Button>
          ) : (
            <Button type="button" className="h-11 w-full justify-between gap-3 px-4" onClick={onActivate}>
              <span className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                {t('onboarding.license.activate')}
              </span>
              <ArrowRight className="h-4 w-4 opacity-80" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-between gap-3 px-4"
            onClick={onBuyLicense}
          >
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" strokeWidth={1.75} />
              {t('onboarding.license.buy')}
            </span>
            <ArrowRight className="h-4 w-4 opacity-80" />
          </Button>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t('onboarding.license.accountNote')}</p>
      </>
    )
  }

  if (step === 'account') {
    return (
      <>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {authIntent === 'purchase'
            ? t('onboarding.account.purchaseEyebrow')
            : t('onboarding.account.activateEyebrow')}
        </p>
        <h1 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
          {authIntent === 'purchase'
            ? t('onboarding.account.purchaseTitle')
            : t('onboarding.account.activateTitle')}
        </h1>
        <p className="mt-2 mb-4 text-sm leading-relaxed text-muted-foreground">
          {authIntent === 'purchase'
            ? t('onboarding.account.purchaseBody')
            : t('onboarding.account.activateBody')}
        </p>
        <AuthForm
          onLogin={onLogin}
          onRegister={onRegister}
          onAuthenticated={onAuthenticated}
          defaultMode={authIntent === 'purchase' ? 'register' : 'login'}
        />
      </>
    )
  }

  return (
    <>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-foreground">
        {t('onboarding.ready.title')}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t('onboarding.ready.body')}</p>
      <p className="mt-4 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-[13px] text-foreground">
        {t('onboarding.ready.plan', { plan: planLabel(session, t('plans.price.free')) })}
      </p>
    </>
  )
}

function FeatureRow({ title, body }: { title: string; body: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

function OnboardingFooter({
  step,
  canGoBack,
  onBack,
  onContinue,
  onFinish
}: {
  step: OnboardingStep
  canGoBack: boolean
  onBack: () => void
  onContinue: () => void
  onFinish: () => void
}): React.ReactElement {
  const { t } = useTranslation()

  if (step === 'license') {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          className={cn('h-10 gap-1.5 px-3', !canGoBack && 'invisible')}
          onClick={onBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
        <span className="text-[11px] text-muted-foreground">{t('onboarding.license.eyebrow')}</span>
      </>
    )
  }

  if (step === 'account') {
    return (
      <>
        <Button type="button" variant="ghost" className="h-10 gap-1.5 px-3" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {t('onboarding.account.backToLicense')}
        </Button>
        <span />
      </>
    )
  }

  if (step === 'ready') {
    return (
      <>
        <span />
        <Button type="button" className="h-10 gap-2" onClick={onFinish}>
          {t('onboarding.ready.start')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className={cn('h-10 gap-1.5 px-3', !canGoBack && 'invisible')}
        onClick={onBack}
        disabled={!canGoBack}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </Button>
      <Button type="button" className="h-10 min-w-[132px] gap-2" onClick={onContinue}>
        {t('common.continue')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </>
  )
}

import { useEffect } from 'react'
import { AppProviders } from '@/providers/AppProviders'
import { AppRouter } from '@/routes/AppRouter'
import { AuthBootScreen } from '@/features/auth/components/AuthGate'
import { OnboardingFlow } from '@/features/onboarding/components/OnboardingFlow'
import { WindowFrame } from '@/components/desktop/WindowFrame'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { useAuthSession } from '@/hooks/useAuthSession'

function AuthenticatedApp(): React.ReactElement {
  const { status, session, login, register } = useAuthSession()
  const completed = useOnboardingStore((s) => s.completed)
  const flowActive = useOnboardingStore((s) => s.flowActive)
  const markFlowActive = useOnboardingStore((s) => s.markFlowActive)
  const skipForExistingSession = useOnboardingStore((s) => s.skipForExistingSession)

  useEffect(() => {
    if (status === 'unauthenticated') {
      markFlowActive()
      return
    }
    if (status === 'authenticated' && !flowActive) {
      skipForExistingSession()
    }
  }, [flowActive, markFlowActive, skipForExistingSession, status])

  if (status === 'loading') {
    return (
      <WindowFrame variant="simple">
        <AuthBootScreen />
      </WindowFrame>
    )
  }

  const showOnboarding =
    status === 'unauthenticated' || (status === 'authenticated' && flowActive && !completed)

  if (showOnboarding) {
    return (
      <WindowFrame variant="simple">
        <OnboardingFlow
          authenticated={status === 'authenticated'}
          session={session}
          onLogin={login}
          onRegister={register}
        />
      </WindowFrame>
    )
  }

  return (
    <WindowFrame variant="app">
      <AppRouter />
    </WindowFrame>
  )
}

export function App(): React.ReactElement {
  return (
    <AppProviders>
      <AuthenticatedApp />
    </AppProviders>
  )
}

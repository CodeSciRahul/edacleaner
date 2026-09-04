import { useEffect } from 'react'
import { AppProviders } from '@/providers/AppProviders'
import { AppRouter } from '@/routes/AppRouter'
import { SplashScreen } from '@/features/auth/components/AuthGate'
import { AuthWindowPage } from '@/features/auth/components/AuthWindowPage'
import { isAuthWindowHash, parseAuthWindowMode } from '@/features/auth/lib/auth-window'
import { OnboardingFlow } from '@/features/onboarding/components/OnboardingFlow'
import { WindowFrame } from '@/components/desktop/WindowFrame'
import { useOnboardingStore } from '@/features/onboarding/store/onboarding-store'
import { useAuthSession } from '@/hooks/useAuthSession'
import { electronService } from '@/services/electron-service'

function AuthWindowApp(): React.ReactElement {
  const { status, login, register } = useAuthSession()
  const defaultMode = parseAuthWindowMode()

  if (status === 'loading') {
    return <SplashScreen showMaximize={false} />
  }

  return (
    <WindowFrame variant="overlay">
      <AuthWindowPage onLogin={login} onRegister={register} defaultMode={defaultMode} />
    </WindowFrame>
  )
}

function AuthenticatedApp(): React.ReactElement {
  const { status, session } = useAuthSession()
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

  const showOnboarding =
    status === 'unauthenticated' || (status === 'authenticated' && flowActive && !completed)

  useEffect(() => {
    if (status === 'loading') return
    void electronService.app().setWindowLayout(showOnboarding ? 'onboarding' : 'app')
  }, [showOnboarding, status])

  if (status === 'loading') {
    return <SplashScreen />
  }

  if (showOnboarding) {
    return (
      <WindowFrame variant="overlay">
        <OnboardingFlow authenticated={status === 'authenticated'} session={session} />
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
      {isAuthWindowHash() ? <AuthWindowApp /> : <AuthenticatedApp />}
    </AppProviders>
  )
}

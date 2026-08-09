import { AppProviders } from '@/providers/AppProviders'
import { AppRouter } from '@/routes/AppRouter'
import { AuthBootScreen, AuthGate } from '@/features/auth/components/AuthGate'
import { useAuthSession } from '@/hooks/useAuthSession'

function AuthenticatedApp(): React.ReactElement {
  const { status, login, register } = useAuthSession()

  if (status === 'loading') {
    return <AuthBootScreen />
  }

  if (status === 'unauthenticated') {
    return <AuthGate onLogin={login} onRegister={register} />
  }

  return <AppRouter />
}

export function App(): React.ReactElement {
  return (
    <AppProviders>
      <AuthenticatedApp />
    </AppProviders>
  )
}

import { HashRouter, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { routes } from '@/routes/index'
import { OnboardingFlow } from '@/features/onboarding/components/OnboardingFlow'
import { useAuthSession } from '@/hooks/useAuthSession'
import { WindowFrame } from '@/components/desktop/WindowFrame'

function StandaloneOnboarding(): React.ReactElement {
  const { status, session } = useAuthSession()
  return (
    <WindowFrame variant="overlay">
      <OnboardingFlow authenticated={status === 'authenticated'} session={session} />
    </WindowFrame>
  )
}

/** HashRouter is required for packaged Electron (file://); BrowserRouter blanks the window. */
export function AppRouter(): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/onboarding" element={<StandaloneOnboarding />} />
        <Route element={<MainLayout />}>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Route>
      </Routes>
    </HashRouter>
  )
}


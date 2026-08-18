import authArt from '@/assets/auth.png'
import { AuthWindowForm } from '@/features/auth/components/AuthWindowForm'
import type { AuthCredentials, AuthSessionSnapshot } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'
import { useTranslation } from '@/i18n/useTranslation'

interface AuthWindowPageProps {
  onLogin: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  onRegister: (credentials: AuthCredentials) => Promise<AuthSessionSnapshot>
  defaultMode?: 'login' | 'register'
}

export function AuthWindowPage({
  onLogin,
  onRegister,
  defaultMode = 'login'
}: AuthWindowPageProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#d7eaf6]">
      <img
        src={authArt}
        alt={t('onboarding.hero.artAlt')}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
      />

      <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)] items-center gap-6 px-8 py-8">
        <div aria-hidden="true" />
        <div className="flex max-h-full justify-end">
          <AuthWindowForm
            onLogin={onLogin}
            onRegister={onRegister}
            defaultMode={defaultMode}
            onAuthenticated={() => {
              void electronService.app().closeWindow()
            }}
          />
        </div>
      </div>
    </div>
  )
}

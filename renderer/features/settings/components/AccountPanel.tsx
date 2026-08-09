import { useEffect, useState } from 'react'
import { Loader2, LogOut, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Separator } from '@/components/ui/Separator'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { SettingsInfoRow } from '@/features/settings/components/SettingsRow'
import { authService, type AuthSessionSnapshot } from '@/services/auth-service'
import { electronService } from '@/services/electron-service'
import { useTranslation } from '@/i18n/useTranslation'

export function AccountPanel(): React.ReactElement {
  const { t } = useTranslation()
  const [session, setSession] = useState<AuthSessionSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const next = await authService.getSession()
        if (!cancelled) setSession(next)
      } catch {
        if (!cancelled) setSession(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    const unsubscribe = authService.onSessionChanged((event) => {
      setSession(event.session)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  async function handleLogout(): Promise<void> {
    setError(null)

    const confirmed = await electronService.dialog().message({
      type: 'warning',
      title: t('settings.account.logoutConfirmTitle'),
      message: t('settings.account.logoutConfirmMessage'),
      detail: t('settings.account.logoutConfirmDetail'),
      buttons: [t('common.cancel'), t('settings.account.logout')]
    })

    if (confirmed.response !== 1) return

    setLoggingOut(true)
    try {
      await authService.logout()
    } catch {
      setError(t('settings.account.logoutError'))
      setLoggingOut(false)
    }
  }

  const user = session?.user
  const name = loading ? '…' : user?.name?.trim() || t('settings.account.nameEmpty')
  const email = loading ? '…' : user?.email || '—'

  return (
    <SettingsSection
      icon={UserRound}
      title={t('settings.account.title')}
      description={t('settings.account.description')}
      action={
        <Badge variant="secondary" className="rounded-md">
          {session?.offline ? t('settings.account.offline') : t('settings.account.signedIn')}
        </Badge>
      }
    >
      <div className="space-y-1">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <SettingsInfoRow label={t('settings.account.name')} value={name} />
        <SettingsInfoRow label={t('settings.account.email')} value={email} />

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t('settings.account.logoutHint')}
          </p>
          <Button
            size="sm"
            variant="destructive"
            className="h-9 gap-2 rounded-lg"
            onClick={() => void handleLogout()}
            disabled={loggingOut || loading || !session?.authenticated}
          >
            {loggingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {loggingOut ? t('settings.account.loggingOut') : t('settings.account.logout')}
          </Button>
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  )
}

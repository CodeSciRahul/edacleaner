import { Loader2 } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'

export function AuthBootScreen(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 bg-background p-6">
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{t('auth.booting')}</p>
    </div>
  )
}

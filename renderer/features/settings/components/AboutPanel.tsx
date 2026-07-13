import { Info, MonitorSmartphone, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { SettingsInfoRow } from '@/features/settings/components/SettingsRow'
import { platformLabel } from '@/features/settings/lib/settings-meta'
import { useAppInfo, useSystemInfo } from '@/features/home/hooks/useHomeData'
import { APP_NAME } from '@shared/constants'
import { formatBytes } from '@shared/utils'
import { electronService } from '@/services/electron-service'
import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'

export function AboutPanel(): React.ReactElement {
  const { t } = useTranslation()
  const { data: appInfo, isLoading: appLoading } = useAppInfo()
  const { data: systemInfo, isLoading: systemLoading } = useSystemInfo()
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  async function handleCheckUpdates(): Promise<void> {
    setChecking(true)
    setUpdateMessage(null)
    try {
      const status = (await electronService.updater().check()) as {
        message?: string
        status?: string
      }
      setUpdateMessage(status?.message ?? t('settings.about.upToDate'))
    } catch {
      setUpdateMessage(t('settings.about.updateError'))
    } finally {
      setChecking(false)
    }
  }

  const version = appLoading ? '…' : (appInfo?.version ?? '—')
  const platform = appLoading ? '…' : platformLabel(appInfo?.platform)
  const osVersion = systemLoading ? '…' : (systemInfo?.osVersion ?? '—')
  const arch = systemLoading ? '…' : (systemInfo?.arch ?? '—')
  const memory =
    systemLoading || !systemInfo
      ? '…'
      : formatBytes(systemInfo.totalMemory)

  return (
    <SettingsSection
      icon={Info}
      title={t('settings.about.title')}
      description={t('settings.about.description')}
      action={
        <Badge variant="secondary" className="rounded-md">
          v{version}
        </Badge>
      }
    >
      <div className="space-y-1">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{t('settings.about.tagline')}</p>
          </div>
        </div>

        <SettingsInfoRow label={t('settings.about.version')} value={version} />
        <SettingsInfoRow label={t('settings.about.platform')} value={platform} />
        <SettingsInfoRow label={t('settings.about.os')} value={osVersion} />
        <SettingsInfoRow label={t('settings.about.arch')} value={arch} />
        <SettingsInfoRow label={t('settings.about.memory')} value={memory} />

        <Separator className="my-4" />

        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MonitorSmartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>{t('settings.about.updatesHint')}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-lg"
            onClick={() => void handleCheckUpdates()}
            disabled={checking}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {checking ? t('settings.about.checking') : t('settings.about.checkUpdates')}
          </Button>
        </div>

        {updateMessage ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground animate-in fade-in-0 duration-200"
          >
            {updateMessage}
          </p>
        ) : null}
      </div>
    </SettingsSection>
  )
}

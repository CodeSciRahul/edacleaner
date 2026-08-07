import { CloudOff, RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import {
  selectPendingCount,
  selectQueuedCount,
  useOfflineStore
} from '@/store/offline-store'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'

interface SidebarOfflineStatusProps {
  collapsed: boolean
}

/**
 * Reuses the existing sidebar System Status card — live offline-engine indicators only.
 */
export function SidebarOfflineStatus({
  collapsed
}: SidebarOfflineStatusProps): React.ReactElement {
  const { t } = useTranslation()
  const online = useOfflineStore((s) => s.online)
  const syncing = useOfflineStore((s) => s.syncing)
  const lastSyncAt = useOfflineStore((s) => s.lastSyncAt)
  const pending = useOfflineStore(selectPendingCount)
  const queued = useOfflineStore(selectQueuedCount)
  const ready = useOfflineStore((s) => s.ready)

  const title = syncing
    ? t('sidebar.sync.synchronizing')
    : online
      ? t('sidebar.sync.online')
      : t('sidebar.sync.offline')

  const detailParts: string[] = []

  if (syncing) {
    detailParts.push(t('sidebar.sync.syncInProgress'))
  }

  if (pending > 0) {
    detailParts.push(t('sidebar.sync.pendingChanges', { count: pending }))
  }

  if (queued > 0) {
    detailParts.push(t('sidebar.sync.queuedRequests', { count: queued }))
  }

  if (lastSyncAt != null) {
    detailParts.push(
      t('sidebar.sync.lastSync', { when: formatRelativeScanTime(lastSyncAt) })
    )
  } else if (!syncing && ready) {
    detailParts.push(t('sidebar.sync.neverSynced'))
  }

  if (detailParts.length === 0) {
    detailParts.push(
      online ? t('sidebar.sync.allClear') : t('sidebar.sync.waitingNetwork')
    )
  }

  const detail = detailParts.join(' · ')

  const tone = syncing
    ? 'primary'
    : !online
      ? 'warning'
      : pending > 0
        ? 'warning'
        : 'success'

  const Icon = syncing
    ? RefreshCw
    : !online
      ? WifiOff
      : pending > 0
        ? CloudOff
        : Wifi

  if (collapsed) {
    return (
      <div
        className="mx-auto flex h-11 w-11 items-center justify-center"
        title={`${title} — ${detail}`}
        aria-label={`${title}. ${detail}`}
      >
        <span
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-lg',
            tone === 'success' && 'bg-success/10 text-success',
            tone === 'warning' && 'bg-warning/10 text-warning',
            tone === 'primary' && 'bg-primary/10 text-primary'
          )}
        >
          <Icon
            className={cn('h-4 w-4', syncing && 'animate-spin')}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          {(pending > 0 || !online) && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full',
                !online ? 'bg-warning' : 'bg-primary'
              )}
              aria-hidden="true"
            />
          )}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-muted px-3 py-2.5"
      aria-live="polite"
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
          tone === 'success' && 'bg-success/10 text-success',
          tone === 'warning' && 'bg-warning/10 text-warning',
          tone === 'primary' && 'bg-primary/10 text-primary'
        )}
      >
        {tone === 'success' && !syncing ? (
          <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Icon
            className={cn('h-[18px] w-[18px]', syncing && 'animate-spin')}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="truncate text-[11px] text-muted-foreground" title={detail}>
          {detail}
        </p>
      </div>
    </div>
  )
}

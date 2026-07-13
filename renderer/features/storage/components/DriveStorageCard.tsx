import { Copy, FileStack, HardDrive, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CircularProgress } from '@/components/desktop/CircularProgress'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import type { DriveInfo } from '@shared/interfaces'
import {
  capacityBarClass,
  capacityStatusClass,
  getCapacityStatus,
  getUsedPercent,
  type CapacityStatus
} from '../lib/storage-health'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

interface DriveStorageCardProps {
  drive: DriveInfo
  selected: boolean
  analyzing: boolean
  onSelect: () => void
  onAnalyze: () => void
  onOpenLargeFiles: () => void
  onOpenDuplicates: () => void
}

const HEALTH_LABEL_KEYS: Record<CapacityStatus, TranslationKey> = {
  normal: 'storage.health.healthy',
  warning: 'storage.health.elevated',
  critical: 'storage.health.critical'
}

export function DriveStorageCard({
  drive,
  selected,
  analyzing,
  onSelect,
  onAnalyze,
  onOpenLargeFiles,
  onOpenDuplicates
}: DriveStorageCardProps): React.ReactElement {
  const { t } = useTranslation()
  const usedPercent = getUsedPercent(drive.usedBytes, drive.totalBytes)
  const status = getCapacityStatus(usedPercent)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'group flex flex-col rounded-xl border bg-card p-5 shadow-card transition-all duration-150',
        'hover:-translate-y-0.5 hover:shadow-card-hover',
        selected
          ? 'border-primary/50 ring-2 ring-primary/20'
          : 'border-border'
      )}
      aria-pressed={selected}
      aria-label={`${drive.label} ${usedPercent}% used`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-chart-disk/15 text-chart-disk">
            <HardDrive className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground">{drive.label}</h3>
            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
              {drive.mountPath}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium',
            capacityStatusClass[status]
          )}
        >
          {t(HEALTH_LABEL_KEYS[status])}
        </span>
      </div>

      <div className="flex flex-1 items-center gap-5">
        <CircularProgress value={usedPercent} color="disk" size={96} strokeWidth={7} />
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <StatRow label={t('storage.drive.used')} value={formatBytes(drive.usedBytes)} />
          <StatRow label={t('storage.drive.free')} value={formatBytes(drive.freeBytes)} emphasize />
          <StatRow label={t('storage.drive.total')} value={formatBytes(drive.totalBytes)} />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>{t('storage.drive.capacity')}</span>
          <span className="tabular-nums">{usedPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-500', capacityBarClass[status])}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          className="h-8 gap-1.5"
          disabled={analyzing}
          onClick={(e) => {
            e.stopPropagation()
            onAnalyze()
          }}
        >
          <ScanSearch className="h-3.5 w-3.5" />
          {analyzing ? t('storage.analyzing') : t('storage.drive.analyze')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={(e) => {
            e.stopPropagation()
            onOpenLargeFiles()
          }}
        >
          <FileStack className="h-3.5 w-3.5" />
          {t('storage.subnav.largeFiles')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          onClick={(e) => {
            e.stopPropagation()
            onOpenDuplicates()
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          {t('storage.subnav.duplicates')}
        </Button>
      </div>
    </article>
  )
}

function StatRow({
  label,
  value,
  emphasize
}: {
  label: string
  value: string
  emphasize?: boolean
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          'tabular-nums font-medium',
          emphasize ? 'text-success' : 'text-foreground'
        )}
      >
        {value}
      </span>
    </div>
  )
}

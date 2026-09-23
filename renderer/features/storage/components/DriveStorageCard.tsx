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
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-card',
        'transition-all duration-200 ease-out hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-chart-disk/45 shadow-[0_18px_40px_-16px_rgba(139,92,246,0.35)] ring-2 ring-chart-disk/20'
          : 'border-border hover:border-chart-disk/35 hover:shadow-[0_18px_40px_-16px_rgba(139,92,246,0.28)]'
      )}
      aria-pressed={selected}
      aria-label={`${drive.label} ${usedPercent}% used`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-chart-disk/20 via-chart-disk/5 to-transparent"
        aria-hidden="true"
      />
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-chart-disk/20 blur-2xl',
          'opacity-60 transition-opacity duration-200 group-hover:opacity-100',
          selected && 'opacity-100'
        )}
        aria-hidden="true"
      />

      <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-chart-disk/15 text-chart-disk shadow-sm ring-1 ring-chart-disk/25 backdrop-blur-sm">
            <HardDrive className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
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
            'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm',
            capacityStatusClass[status]
          )}
        >
          {t(HEALTH_LABEL_KEYS[status])}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 items-center gap-5">
        <CircularProgress value={usedPercent} color="disk" size={96} strokeWidth={7} />
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <StatRow label={t('storage.drive.used')} value={formatBytes(drive.usedBytes)} />
          <StatRow label={t('storage.drive.free')} value={formatBytes(drive.freeBytes)} emphasize />
          <StatRow label={t('storage.drive.total')} value={formatBytes(drive.totalBytes)} />
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>{t('storage.drive.capacity')}</span>
          <span className="tabular-nums font-medium">{usedPercent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/80">
          <div
            className={cn('h-full rounded-full transition-all duration-500', capacityBarClass[status])}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-lg"
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
          className="h-8 gap-1.5 rounded-lg border-border/80 bg-background/60 backdrop-blur-sm"
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
          className="h-8 gap-1.5 rounded-lg border-border/80 bg-background/60 backdrop-blur-sm"
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

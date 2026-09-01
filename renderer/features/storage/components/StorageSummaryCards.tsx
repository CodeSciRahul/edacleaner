import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import {
  aggregateDriveTotals,
  capacityStatusClass,
  type CapacityStatus,
  type DriveTotals
} from '../lib/storage-health'
import type { DriveInfo } from '@shared/interfaces'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { StorageSummaryCard } from './StorageSummaryCard'
import type { StorageSummaryCardId } from '../lib/summary-meta'

interface StorageSummaryCardsProps {
  drives: DriveInfo[]
  isLoading: boolean
}

const HEALTH_LABEL_KEYS: Record<CapacityStatus, TranslationKey> = {
  normal: 'storage.health.healthy',
  warning: 'storage.health.elevated',
  critical: 'storage.health.critical'
}

export function StorageSummaryCards({
  drives,
  isLoading
}: StorageSummaryCardsProps): React.ReactElement {
  const { t } = useTranslation()
  const totals: DriveTotals = aggregateDriveTotals(drives)

  if (isLoading) {
    return (
      <section aria-label={t('storage.summary.capacity')} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-2xl border border-border bg-muted/40"
          />
        ))}
      </section>
    )
  }

  const cards: Array<{
    id: StorageSummaryCardId
    label: string
    value: string
    badge?: React.ReactNode
  }> = [
    {
      id: 'total',
      label: t('storage.summary.capacity'),
      value: formatBytes(totals.totalBytes)
    },
    {
      id: 'used',
      label: t('storage.summary.used'),
      value: formatBytes(totals.usedBytes)
    },
    {
      id: 'free',
      label: t('storage.summary.available'),
      value: formatBytes(totals.freeBytes)
    },
    {
      id: 'percent',
      label: t('storage.summary.usage'),
      value: `${totals.usedPercent}%`
    },
    {
      id: 'health',
      label: t('storage.summary.health'),
      value: t(HEALTH_LABEL_KEYS[totals.overallStatus]),
      badge: (
        <span
          className={cn(
            'mt-1.5 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium',
            capacityStatusClass[totals.overallStatus]
          )}
        >
          {totals.driveCount} drive{totals.driveCount === 1 ? '' : 's'}
        </span>
      )
    }
  ]

  return (
    <section aria-label={t('storage.summary.capacity')} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <StorageSummaryCard
          key={card.id}
          cardId={card.id}
          label={card.label}
          value={drives.length === 0 && card.id !== 'health' ? '—' : card.value}
          badge={card.badge}
        />
      ))}
    </section>
  )
}

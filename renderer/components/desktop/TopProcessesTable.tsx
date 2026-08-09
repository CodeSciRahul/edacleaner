import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import { useTranslation } from '@/i18n/useTranslation'
import { FeatureTeaserBlock } from '@/features/entitlements/components/FeatureTeaserBlock'
import type { FeatureId } from '@shared/entitlements'

interface ProcessRow {
  name: string
  cpu?: number
  memoryBytes?: number
}

interface TopProcessesTableProps {
  processes: ProcessRow[]
  className?: string
  /** When set with locked=true, only this many rows stay sharp. */
  previewCount?: number
  locked?: boolean
  lockFeature?: FeatureId
}

function ProcessRowView({
  process
}: {
  process: ProcessRow
  index?: number
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-6 py-3 text-sm transition-colors hover:bg-muted/40">
      <span className="font-medium text-foreground">{process.name}</span>
      <span className="tabular-nums text-muted-foreground">
        {typeof process.memoryBytes === 'number'
          ? formatBytes(process.memoryBytes)
          : `${process.cpu ?? 0}%`}
      </span>
    </div>
  )
}

export function TopProcessesTable({
  processes,
  className,
  previewCount = 4,
  locked = false,
  lockFeature = 'performance_boost'
}: TopProcessesTableProps): React.ReactElement {
  const { t } = useTranslation()
  const showTeaser = locked && processes.length > previewCount
  const clear = showTeaser ? processes.slice(0, previewCount) : processes
  const teaser = showTeaser ? processes.slice(previewCount, previewCount + 4) : []

  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-card', className)}>
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-card-title text-foreground">{t('processes.title')}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('processes.subtitle')}</p>
      </div>
      <div className="divide-y divide-border">
        {processes.length === 0 ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">{t('processes.empty')}</p>
        ) : (
          <>
            {clear.map((process, index) => (
              <ProcessRowView key={`${process.name}-${index}`} process={process} />
            ))}
            {showTeaser ? (
              <FeatureTeaserBlock feature={lockFeature} maxHeightClassName="max-h-36">
                <div className="divide-y divide-border">
                  {teaser.map((process, index) => (
                    <ProcessRowView
                      key={`teaser-${process.name}-${index}`}
                      process={process}
                    />
                  ))}
                </div>
              </FeatureTeaserBlock>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

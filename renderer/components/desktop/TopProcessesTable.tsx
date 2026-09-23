import { MemoryStick } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatBytes } from '@shared/utils'
import { useTranslation } from '@/i18n/useTranslation'
import { FeatureTeaserBlock } from '@/features/entitlements/components/FeatureTeaserBlock'
import type { FeatureId } from '@shared/entitlements'

interface ProcessRow {
  name: string
  cpu?: number
  memoryBytes?: number
  iconDataUrl?: string
}

interface TopProcessesTableProps {
  processes: ProcessRow[]
  className?: string
  previewCount?: number
  locked?: boolean
  lockFeature?: FeatureId
}

function displayName(processName: string): string {
  return processName.replace(/\.exe$/i, '')
}

function ProcessRowView({
  process,
  index,
  maxMemory
}: {
  process: ProcessRow
  index: number
  maxMemory: number
}): React.ReactElement {
  const label = displayName(process.name)
  const memory = process.memoryBytes ?? 0
  const share =
    maxMemory > 0 && memory > 0 ? Math.max(6, Math.round((memory / maxMemory) * 100)) : 0
  const hasIcon = Boolean(process.iconDataUrl)
  // Windows cumulative CPU can look insane before delta sampling — only show sane %
  const cpu =
    typeof process.cpu === 'number' && process.cpu > 0 && process.cpu <= 400
      ? process.cpu
      : null

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-5 py-3.5 transition-colors',
        'hover:bg-primary/[0.04]'
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/80 text-[10px] font-semibold tabular-nums text-muted-foreground">
        {index + 1}
      </span>

      {hasIcon ? (
        <img
          src={process.iconDataUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-border/60"
          draggable={false}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{label}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {typeof process.memoryBytes === 'number' ? formatBytes(process.memoryBytes) : '—'}
            </p>
            {cpu != null ? (
              <p className="text-[11px] tabular-nums text-muted-foreground">
                CPU {cpu.toFixed(1)}%
              </p>
            ) : null}
          </div>
        </div>

        {share > 0 ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-chart-ram to-primary transition-[width] duration-500"
              style={{ width: `${share}%` }}
            />
          </div>
        ) : null}
      </div>
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
  const maxMemory = Math.max(0, ...processes.map((p) => p.memoryBytes ?? 0))

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card shadow-card',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-chart-ram/15 via-chart-ram/5 to-transparent"
        aria-hidden="true"
      />

      <div className="relative z-10 flex items-start gap-3 border-b border-border/80 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-chart-ram/15 text-chart-ram ring-1 ring-chart-ram/25">
          <MemoryStick className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-card-title text-foreground">{t('processes.title')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('processes.subtitle')}</p>
        </div>
        {processes.length > 0 ? (
          <span className="ml-auto shrink-0 rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
            {processes.length}
          </span>
        ) : null}
      </div>

      <div className="relative z-10 divide-y divide-border/70">
        {processes.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            {t('processes.empty')}
          </p>
        ) : (
          <>
            {clear.map((process, index) => (
              <ProcessRowView
                key={`${process.name}-${index}`}
                process={process}
                index={index}
                maxMemory={maxMemory}
              />
            ))}
            {showTeaser ? (
              <FeatureTeaserBlock feature={lockFeature} maxHeightClassName="max-h-36">
                <div className="divide-y divide-border/70">
                  {teaser.map((process, index) => (
                    <ProcessRowView
                      key={`teaser-${process.name}-${index}`}
                      process={process}
                      index={previewCount + index}
                      maxMemory={maxMemory}
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

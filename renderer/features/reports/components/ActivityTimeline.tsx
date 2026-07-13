import { useNavigate } from 'react-router-dom'
import { Copy, FileStack, ScanSearch, Sparkles, Trash2, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatBytes } from '@shared/utils'
import { cn } from '@/utils/cn'
import { formatRelativeScanTime } from '@/features/smart-scan/lib/scan-history'
import { formatScanDuration } from '@/features/smart-scan/lib/scan-meta'
import {
  activityHref,
  type ActivityEntry
} from '@/features/reports/lib/activity-history'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

interface ActivityTimelineProps {
  entries: ActivityEntry[]
}

const kindStyles: Record<ActivityEntry['kind'], string> = {
  cleanup: 'bg-primary/10 text-primary',
  'smart-scan': 'bg-chart-ram/10 text-chart-ram',
  boost: 'bg-warning/10 text-warning',
  'storage-delete': 'bg-chart-disk/10 text-chart-disk'
}

function kindIcon(entry: ActivityEntry): LucideIcon {
  switch (entry.kind) {
    case 'cleanup':
      return Trash2
    case 'smart-scan':
      return ScanSearch
    case 'boost':
      return Zap
    case 'storage-delete':
      return entry.source === 'duplicates' ? Copy : FileStack
  }
}

function kindTitleKey(entry: ActivityEntry): TranslationKey {
  switch (entry.kind) {
    case 'cleanup':
      return 'reports.kind.cleanup'
    case 'smart-scan':
      return 'reports.kind.smartScan'
    case 'boost':
      return 'reports.kind.boost'
    case 'storage-delete':
      return entry.source === 'duplicates'
        ? 'reports.kind.storageDupes'
        : 'reports.kind.storageLarge'
  }
}

function getResultLine(
  entry: ActivityEntry,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
): string {
  switch (entry.kind) {
    case 'cleanup':
      if (entry.bytesFreed > 0) {
        return t('reports.result.bytesFreed', { bytes: formatBytes(entry.bytesFreed) })
      }
      return t('reports.result.filesRemoved', { count: entry.filesRemoved })
    case 'smart-scan':
      if (entry.issuesFound > 0) {
        return t('reports.result.scan', {
          score: entry.healthScore,
          issues: entry.issuesFound,
          files: entry.filesScanned
        })
      }
      return t('reports.result.scanGood', {
        score: entry.healthScore,
        files: entry.filesScanned
      })
    case 'boost':
      return t('reports.result.boost', {
        disk: formatBytes(entry.diskFreedBytes),
        memory: formatBytes(entry.memoryReclaimedBytes),
        processes: entry.processesTerminated
      })
    case 'storage-delete':
      return t('reports.result.storage', {
        bytes: formatBytes(entry.bytesFreed),
        count: entry.deletedCount
      })
  }
}

export function ActivityTimeline({ entries }: ActivityTimelineProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section aria-label={t('reports.activity')}>
      <div className="mb-4">
        <h2 className="text-section-title text-foreground">{t('reports.activity')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('reports.activityHint')}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <ul className="divide-y divide-border">
          {entries.map((entry, index) => {
            const Icon = kindIcon(entry)
            const resultLine = getResultLine(entry, t)

            return (
              <li
                key={entry.id}
                className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
              >
                <button
                  type="button"
                  onClick={() => navigate(activityHref(entry))}
                  className={cn(
                    'flex w-full items-center gap-4 px-4 py-4 text-left',
                    'outline-none transition-all duration-150',
                    'hover:bg-accent/30 focus-visible:bg-accent/40',
                    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      kindStyles[entry.kind]
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {t(kindTitleKey(entry))}
                      </p>
                      {entry.kind === 'smart-scan' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                          <Sparkles className="h-3 w-3" aria-hidden="true" />
                          {entry.healthScore}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeScanTime(entry.at)}
                      {entry.durationMs > 0 ? ` · ${formatScanDuration(entry.durationMs)}` : ''}
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-sm font-medium text-foreground">{resultLine}</p>
                    <p className="text-xs text-muted-foreground">{t('reports.open')}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

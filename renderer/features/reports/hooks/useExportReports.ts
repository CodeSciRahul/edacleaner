import { useCallback, useState } from 'react'
import { electronService } from '@/services/electron-service'
import { useFeatureAccess } from '@/features/entitlements/hooks/useFeatureAccess'
import { useTranslation } from '@/i18n/useTranslation'
import type { ReportsHistoryRecord } from '@/features/reports/lib/activity-history'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'
import {
  buildReportsCsv,
  buildReportsDoc,
  buildReportsPdf,
  defaultReportFilename,
  type ReportExportFormat,
  type ReportExportLabels
} from '@/features/reports/lib/export-report'

function ensureExtension(filePath: string, ext: ReportExportFormat): string {
  const lower = filePath.toLowerCase()
  if (lower.endsWith(`.${ext}`)) return filePath
  return `${filePath}.${ext}`
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function saveFilters(format: ReportExportFormat): Array<{ name: string; extensions: string[] }> {
  switch (format) {
    case 'pdf':
      return [{ name: 'PDF', extensions: ['pdf'] }]
    case 'csv':
      return [{ name: 'CSV', extensions: ['csv'] }]
    case 'doc':
      return [{ name: 'Word Document', extensions: ['doc'] }]
  }
}

export function useExportReports(
  history: ReportsHistoryRecord | null,
  analytics: ReportsAnalytics | null
): {
  exporting: boolean
  exportReport: (format: ReportExportFormat) => Promise<void>
} {
  const { t } = useTranslation()
  const access = useFeatureAccess('cleanup_reports')
  const [exporting, setExporting] = useState(false)

  const labels = useCallback((): ReportExportLabels => {
    return {
      title: t('reports.export.pdfTitle'),
      generated: t('reports.export.generated'),
      summary: t('reports.summary'),
      healthScore: t('reports.health.score'),
      spaceReclaimed: t('reports.spaceRecovered'),
      optimizations: t('reports.optimizations'),
      smartScans: t('reports.smartScans'),
      cleanups: t('reports.totalCleanups'),
      boosts: t('reports.export.boosts'),
      storageDeletes: t('reports.export.storageDeletes'),
      issuesFound: t('reports.issues.found'),
      issuesResolved: t('reports.issues.resolved'),
      filesTouched: t('reports.filesTouched'),
      lastScan: t('reports.lastScan.title'),
      noLastScan: t('reports.lastScan.none'),
      history: t('reports.activity'),
      colWhen: t('reports.export.colWhen'),
      colKind: t('reports.export.colKind'),
      colResult: t('reports.export.colResult'),
      colBytes: t('reports.export.colBytes'),
      colItems: t('reports.export.colItems'),
      colStatus: t('reports.export.colStatus'),
      statusOk: t('reports.export.statusOk'),
      statusFail: t('reports.export.statusFail'),
      statusCancelled: t('reports.export.statusCancelled'),
      kindCleanup: t('reports.kind.cleanup'),
      kindSmartScan: t('reports.kind.smartScan'),
      kindBoost: t('reports.kind.boost'),
      kindStorageLarge: t('reports.kind.storageLarge'),
      kindStorageDupes: t('reports.kind.storageDupes')
    }
  }, [t])

  const exportReport = useCallback(
    async (format: ReportExportFormat): Promise<void> => {
      if (!access.guard()) return
      if (!history || !analytics || history.entries.length === 0) {
        await electronService.dialog().error(
          t('reports.export.failedTitle'),
          t('reports.export.noData')
        )
        return
      }

      setExporting(true)
      try {
        const save = await electronService.dialog().save({
          title: t('reports.export.saveTitle'),
          defaultPath: defaultReportFilename(format),
          filters: saveFilters(format)
        })

        if (save.canceled || !save.filePath) return

        const filePath = ensureExtension(save.filePath, format)
        const exportLabels = labels()

        if (format === 'csv') {
          await electronService.file().write(filePath, buildReportsCsv(history, exportLabels))
        } else if (format === 'doc') {
          await electronService.file().write(filePath, buildReportsDoc(history, analytics, exportLabels))
        } else {
          const pdf = buildReportsPdf(history, analytics, exportLabels)
          await electronService.file().writeBinary(filePath, uint8ToBase64(pdf))
        }

        await electronService.dialog().message({
          type: 'info',
          title: t('reports.export.successTitle'),
          message: t('reports.export.successMessage', { path: filePath }),
          buttons: [t('reports.export.ok')]
        })
      } catch (err) {
        await electronService.dialog().error(
          t('reports.export.failedTitle'),
          err instanceof Error ? err.message : t('reports.export.failedMessage')
        )
      } finally {
        setExporting(false)
      }
    },
    [access, analytics, history, labels, t]
  )

  return { exporting, exportReport }
}

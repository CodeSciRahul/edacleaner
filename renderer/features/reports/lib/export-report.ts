import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatBytes } from '@shared/utils'
import type { ActivityEntry, ReportsHistoryRecord } from '@/features/reports/lib/activity-history'
import type { ReportsAnalytics } from '@/features/reports/lib/reports-analytics'

export type ReportExportFormat = 'pdf' | 'csv' | 'doc'

export interface ReportExportLabels {
  title: string
  generated: string
  summary: string
  healthScore: string
  spaceReclaimed: string
  optimizations: string
  smartScans: string
  cleanups: string
  boosts: string
  storageDeletes: string
  issuesFound: string
  issuesResolved: string
  filesTouched: string
  lastScan: string
  noLastScan: string
  history: string
  colWhen: string
  colKind: string
  colResult: string
  colBytes: string
  colItems: string
  colStatus: string
  statusOk: string
  statusFail: string
  statusCancelled: string
  kindCleanup: string
  kindSmartScan: string
  kindBoost: string
  kindStorageLarge: string
  kindStorageDupes: string
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function formatWhen(at: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(at))
}

function kindLabel(entry: ActivityEntry, labels: ReportExportLabels): string {
  switch (entry.kind) {
    case 'cleanup':
      return labels.kindCleanup
    case 'smart-scan':
      return labels.kindSmartScan
    case 'boost':
      return labels.kindBoost
    case 'storage-delete':
      return entry.source === 'duplicates' ? labels.kindStorageDupes : labels.kindStorageLarge
  }
}

function statusLabel(entry: ActivityEntry, labels: ReportExportLabels): string {
  if (entry.cancelled) return labels.statusCancelled
  if (!entry.success) return labels.statusFail
  return labels.statusOk
}

function resultSummary(entry: ActivityEntry): string {
  switch (entry.kind) {
    case 'cleanup':
      return entry.bytesFreed > 0
        ? formatBytes(entry.bytesFreed)
        : `${entry.filesRemoved} files`
    case 'smart-scan':
      return `health ${entry.healthScore} · ${entry.issuesFound} issues · ${entry.filesScanned} files`
    case 'boost':
      return `${formatBytes(entry.diskFreedBytes)} disk · ${formatBytes(entry.memoryReclaimedBytes)} memory`
    case 'storage-delete':
      return `${formatBytes(entry.bytesFreed)} · ${entry.deletedCount} deleted`
  }
}

function dateStamp(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function defaultReportFilename(format: ReportExportFormat, d = new Date()): string {
  return `eda-cleaner-report-${dateStamp(d)}.${format}`
}

export function buildReportsCsv(
  history: ReportsHistoryRecord,
  labels: ReportExportLabels
): string {
  const header = [
    labels.colWhen,
    labels.colKind,
    labels.colStatus,
    labels.colBytes,
    labels.colItems,
    labels.colResult,
    'DurationMs',
    'HealthScore',
    'IssuesFound',
    'FilesScanned',
    'Categories',
    'Source'
  ]
    .map(csvEscape)
    .join(',')

  const rows = history.entries.map((entry) => {
    const bytes = String(entry.bytesFreed)
    const items = String(entry.itemsAffected)
    const health =
      entry.kind === 'smart-scan' ? String(entry.healthScore) : ''
    const issues = entry.kind === 'smart-scan' ? String(entry.issuesFound) : ''
    const files = entry.kind === 'smart-scan' ? String(entry.filesScanned) : ''
    const categories =
      entry.kind === 'cleanup' ? entry.categories.join('|') : ''
    const source = entry.kind === 'storage-delete' ? entry.source : ''

    return [
      csvEscape(formatWhen(entry.at)),
      csvEscape(kindLabel(entry, labels)),
      csvEscape(statusLabel(entry, labels)),
      csvEscape(bytes),
      csvEscape(items),
      csvEscape(resultSummary(entry)),
      csvEscape(String(entry.durationMs)),
      csvEscape(health),
      csvEscape(issues),
      csvEscape(files),
      csvEscape(categories),
      csvEscape(source)
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

export function buildReportsPdf(
  history: ReportsHistoryRecord,
  analytics: ReportsAnalytics,
  labels: ReportExportLabels
): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 40
  let y = 48

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(labels.title, marginX, y)
  y += 22

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(90)
  doc.text(`${labels.generated}: ${formatWhen(Date.now())}`, marginX, y)
  doc.setTextColor(0)
  y += 28

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(labels.summary, marginX, y)
  y += 14

  const summaryRows: string[][] = [
    [labels.healthScore, analytics.healthScore != null ? String(analytics.healthScore) : '—'],
    [labels.spaceReclaimed, formatBytes(analytics.lifetimeBytesFreed)],
    [labels.optimizations, String(analytics.optimizations)],
    [labels.smartScans, String(analytics.totals.scanCount)],
    [labels.cleanups, String(analytics.totals.cleanupCount)],
    [labels.boosts, String(analytics.totals.boostCount)],
    [labels.storageDeletes, String(analytics.totals.storageDeleteCount)],
    [labels.issuesFound, String(analytics.issuesFoundLifetime)],
    [labels.issuesResolved, String(analytics.issuesResolved)],
    [labels.filesTouched, String(analytics.filesTouched)]
  ]

  autoTable(doc, {
    startY: y,
    head: [],
    body: summaryRows,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 160 },
      1: { cellWidth: 280 }
    },
    margin: { left: marginX, right: marginX }
  })

  y = (
    doc as jsPDF & { lastAutoTable?: { finalY: number } }
  ).lastAutoTable?.finalY ?? y + 120
  y += 22

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(labels.lastScan, marginX, y)
  y += 16
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  if (analytics.lastScan) {
    const scan = analytics.lastScan
    doc.text(
      `Health ${scan.healthScore} · ${scan.issuesFound} issues · ${scan.filesScanned} files · ${formatWhen(scan.at)}`,
      marginX,
      y
    )
  } else {
    doc.setTextColor(90)
    doc.text(labels.noLastScan, marginX, y)
    doc.setTextColor(0)
  }
  y += 28

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(labels.history, marginX, y)
  y += 8

  const historyBody = history.entries.map((entry) => [
    formatWhen(entry.at),
    kindLabel(entry, labels),
    statusLabel(entry, labels),
    formatBytes(entry.bytesFreed),
    String(entry.itemsAffected),
    resultSummary(entry)
  ])

  autoTable(doc, {
    startY: y,
    head: [
      [
        labels.colWhen,
        labels.colKind,
        labels.colStatus,
        labels.colBytes,
        labels.colItems,
        labels.colResult
      ]
    ],
    body: historyBody.length > 0 ? historyBody : [['—', '—', '—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: marginX, right: marginX },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 78 },
      2: { cellWidth: 58 },
      3: { cellWidth: 58 },
      4: { cellWidth: 42 },
      5: { cellWidth: 'auto' }
    }
  })

  const arrayBuffer = doc.output('arraybuffer')
  return new Uint8Array(arrayBuffer)
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Word-compatible HTML document saved as `.doc` (opens in Word / LibreOffice). */
export function buildReportsDoc(
  history: ReportsHistoryRecord,
  analytics: ReportsAnalytics,
  labels: ReportExportLabels
): string {
  const summaryRows: Array<[string, string]> = [
    [labels.healthScore, analytics.healthScore != null ? String(analytics.healthScore) : '—'],
    [labels.spaceReclaimed, formatBytes(analytics.lifetimeBytesFreed)],
    [labels.optimizations, String(analytics.optimizations)],
    [labels.smartScans, String(analytics.totals.scanCount)],
    [labels.cleanups, String(analytics.totals.cleanupCount)],
    [labels.boosts, String(analytics.totals.boostCount)],
    [labels.storageDeletes, String(analytics.totals.storageDeleteCount)],
    [labels.issuesFound, String(analytics.issuesFoundLifetime)],
    [labels.issuesResolved, String(analytics.issuesResolved)],
    [labels.filesTouched, String(analytics.filesTouched)]
  ]

  const lastScanHtml = analytics.lastScan
    ? htmlEscape(
        `Health ${analytics.lastScan.healthScore} · ${analytics.lastScan.issuesFound} issues · ${analytics.lastScan.filesScanned} files · ${formatWhen(analytics.lastScan.at)}`
      )
    : htmlEscape(labels.noLastScan)

  const historyRows =
    history.entries.length > 0
      ? history.entries
          .map(
            (entry) => `<tr>
      <td>${htmlEscape(formatWhen(entry.at))}</td>
      <td>${htmlEscape(kindLabel(entry, labels))}</td>
      <td>${htmlEscape(statusLabel(entry, labels))}</td>
      <td>${htmlEscape(formatBytes(entry.bytesFreed))}</td>
      <td>${htmlEscape(String(entry.itemsAffected))}</td>
      <td>${htmlEscape(resultSummary(entry))}</td>
    </tr>`
          )
          .join('')
      : `<tr><td colspan="6">—</td></tr>`

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${htmlEscape(labels.title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
  h1 { font-size: 18pt; margin: 0 0 8pt; }
  h2 { font-size: 13pt; margin: 18pt 0 8pt; }
  .meta { color: #555; margin-bottom: 16pt; }
  table { border-collapse: collapse; width: 100%; margin-top: 6pt; }
  th, td { border: 1px solid #cbd5e1; padding: 6pt 8pt; text-align: left; vertical-align: top; }
  th { background: #2563eb; color: #fff; }
  tr:nth-child(even) td { background: #f8fafc; }
  .summary td:first-child { font-weight: bold; width: 40%; }
</style>
</head>
<body>
  <h1>${htmlEscape(labels.title)}</h1>
  <p class="meta">${htmlEscape(labels.generated)}: ${htmlEscape(formatWhen(Date.now()))}</p>
  <h2>${htmlEscape(labels.summary)}</h2>
  <table class="summary">
    ${summaryRows
      .map(
        ([k, v]) =>
          `<tr><td>${htmlEscape(k)}</td><td>${htmlEscape(v)}</td></tr>`
      )
      .join('')}
  </table>
  <h2>${htmlEscape(labels.lastScan)}</h2>
  <p>${lastScanHtml}</p>
  <h2>${htmlEscape(labels.history)}</h2>
  <table>
    <thead>
      <tr>
        <th>${htmlEscape(labels.colWhen)}</th>
        <th>${htmlEscape(labels.colKind)}</th>
        <th>${htmlEscape(labels.colStatus)}</th>
        <th>${htmlEscape(labels.colBytes)}</th>
        <th>${htmlEscape(labels.colItems)}</th>
        <th>${htmlEscape(labels.colResult)}</th>
      </tr>
    </thead>
    <tbody>${historyRows}</tbody>
  </table>
</body>
</html>`
}

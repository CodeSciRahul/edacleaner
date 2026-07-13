import { app } from 'electron'
import { access } from 'fs/promises'
import { formatBytes } from '@shared/utils'
import type { SmartScanAreaResult } from '@shared/interfaces'
import { storageService } from '@main/services/storage-service'
import type { SmartScanModule, SmartScanModuleContext } from './types'

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Lightweight storage check: drives + capped large-file / duplicate sample
 * under Downloads (and Desktop when available) for responsiveness.
 */
export const storageScanModule: SmartScanModule = {
  id: 'storage',
  label: 'Storage',
  description: 'Large files and duplicates',
  href: '/storage',

  async scan(ctx: SmartScanModuleContext): Promise<SmartScanAreaResult> {
    ctx.emit({
      phase: 'scanning-storage',
      areaId: 'storage',
      message: 'Analyzing storage health…',
      percent: ctx.basePercent + 8
    })

    try {
      const drives = await storageService.getDrives()
      const lowDrive = drives.find(
        (d) => d.totalBytes > 0 && d.freeBytes / d.totalBytes < 0.1
      )

      ctx.emit({
        phase: 'scanning-storage',
        areaId: 'storage',
        message: 'Looking for oversized and duplicate files…',
        percent: ctx.basePercent + Math.round(ctx.spanPercent * 0.35)
      })

      if (ctx.signal.aborted) {
        throw new Error('Scan cancelled')
      }

      const roots: string[] = []
      const downloads = app.getPath('downloads')
      if (await pathExists(downloads)) roots.push(downloads)
      try {
        const desktop = app.getPath('desktop')
        if (await pathExists(desktop)) roots.push(desktop)
      } catch {
        // desktop path unavailable on some setups
      }

      const scanRoot = roots[0] ?? app.getPath('home')

      const [largeFiles, duplicates] = await Promise.all([
        storageService.findLargeFiles({
          rootPath: scanRoot,
          minBytes: 50 * 1024 * 1024,
          limit: 12
        }),
        storageService
          .findDuplicates({
            rootPath: scanRoot,
            minBytes: 5 * 1024 * 1024,
            limit: 10
          })
          .catch(() => [])
      ])

      if (ctx.signal.aborted) {
        throw new Error('Scan cancelled')
      }

      const largeBytes = largeFiles.reduce((sum, f) => sum + f.sizeBytes, 0)
      const duplicateBytes = duplicates.reduce(
        (sum, g) => sum + g.sizeBytes * Math.max(0, g.copies - 1),
        0
      )
      const filesScanned =
        largeFiles.length + duplicates.reduce((sum, g) => sum + g.paths.length, 0)

      let status: SmartScanAreaResult['status'] = 'good'
      let finding = 'Storage looks well organized'

      if (lowDrive) {
        status = 'issue'
        finding = `Low space on ${lowDrive.label || lowDrive.mountPath}`
      } else if (duplicateBytes >= 200 * 1024 * 1024) {
        status = 'warning'
        finding = `${formatBytes(duplicateBytes)} in duplicates`
      } else if (largeBytes >= 2 * 1024 * 1024 * 1024) {
        status = 'warning'
        finding = `${formatBytes(largeBytes)} in large files`
      } else if (duplicateBytes > 0) {
        status = 'warning'
        finding = `${formatBytes(duplicateBytes)} in duplicates`
      }

      return {
        id: 'storage',
        label: this.label,
        description: this.description,
        status,
        finding,
        href: this.href,
        reclaimableBytes: duplicateBytes,
        filesScanned,
        metricLabel: 'Duplicate Files',
        metricValue: formatBytes(duplicateBytes)
      }
    } catch {
      return {
        id: 'storage',
        label: this.label,
        description: this.description,
        status: 'good',
        finding: 'Storage check complete',
        href: this.href,
        metricLabel: 'Duplicate Files',
        metricValue: formatBytes(0)
      }
    }
  }
}

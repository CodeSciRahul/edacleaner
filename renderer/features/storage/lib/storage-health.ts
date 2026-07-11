export type CapacityStatus = 'normal' | 'warning' | 'critical'

export function getUsedPercent(usedBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((usedBytes / totalBytes) * 100)))
}

export function getCapacityStatus(usedPercent: number): CapacityStatus {
  if (usedPercent > 85) return 'critical'
  if (usedPercent >= 70) return 'warning'
  return 'normal'
}

export const capacityStatusLabel: Record<CapacityStatus, string> = {
  normal: 'Healthy',
  warning: 'Elevated',
  critical: 'Critical'
}

export const capacityStatusClass: Record<CapacityStatus, string> = {
  normal: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  critical: 'border-destructive/30 bg-destructive/10 text-destructive'
}

export const capacityBarClass: Record<CapacityStatus, string> = {
  normal: 'bg-success',
  warning: 'bg-warning',
  critical: 'bg-destructive'
}

export interface DriveTotals {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  usedPercent: number
  driveCount: number
  overallStatus: CapacityStatus
}

export function aggregateDriveTotals(
  drives: Array<{ usedBytes: number; totalBytes: number; freeBytes: number }>
): DriveTotals {
  let totalBytes = 0
  let usedBytes = 0
  let freeBytes = 0
  let worst: CapacityStatus = 'normal'

  for (const drive of drives) {
    totalBytes += drive.totalBytes
    usedBytes += drive.usedBytes
    freeBytes += drive.freeBytes
    const status = getCapacityStatus(getUsedPercent(drive.usedBytes, drive.totalBytes))
    if (status === 'critical') worst = 'critical'
    else if (status === 'warning' && worst !== 'critical') worst = 'warning'
  }

  return {
    totalBytes,
    usedBytes,
    freeBytes,
    usedPercent: getUsedPercent(usedBytes, totalBytes),
    driveCount: drives.length,
    overallStatus: worst
  }
}

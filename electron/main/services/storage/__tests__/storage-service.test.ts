import { describe, expect, it } from 'vitest'
import { storageService } from '@main/services/storage-service'

describe('StorageService', () => {
  it('returns valid local drives on the current platform', async () => {
    const drives = await storageService.getDrives()
    expect(Array.isArray(drives)).toBe(true)
    expect(drives.length).toBeGreaterThan(0)

    const primaryDrive = drives[0]
    expect(primaryDrive.totalBytes).toBeGreaterThan(0)
    expect(primaryDrive.freeBytes).toBeGreaterThan(0)
    expect(primaryDrive.usedBytes).toBeGreaterThan(0)

    if (process.platform === 'darwin') {
      // Primary drive on macOS must be root '/'
      expect(primaryDrive.mountPath).toBe('/')
      expect(primaryDrive.label).toMatch(/macintosh/i)

      // Must not include mounted DMGs or installer disk images
      const dmgDrive = drives.find((d) => d.mountPath.includes('EDA Cleaner') || d.label.includes('EDA Cleaner'))
      expect(dmgDrive).toBeUndefined()

      // On this development machine without external drives, only Macintosh HD should be present
      expect(drives).toHaveLength(1)
    }
  })
})

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { electronService } from '@/services/electron-service'
import type { FindDuplicatesOptions, FindLargeFilesOptions } from '@shared/interfaces'

export const storageKeys = {
  drives: ['storage', 'drives'] as const,
  usage: (mountPath?: string) => ['storage', 'usage', mountPath ?? 'default'] as const,
  largeFiles: (options?: FindLargeFilesOptions) =>
    ['storage', 'large-files', options ?? {}] as const,
  duplicates: (options?: FindDuplicatesOptions) =>
    ['storage', 'duplicates', options ?? {}] as const
}

export function useStorageDrives() {
  return useQuery({
    queryKey: storageKeys.drives,
    queryFn: () => electronService.storage().getDrives()
  })
}

export function useStorageUsage(mountPath?: string, enabled = true) {
  return useQuery({
    queryKey: storageKeys.usage(mountPath),
    queryFn: () => electronService.storage().analyzeUsage(mountPath),
    enabled
  })
}

export function useLargeFiles(options?: FindLargeFilesOptions, enabled = true) {
  return useQuery({
    queryKey: storageKeys.largeFiles(options),
    queryFn: () => electronService.storage().findLargeFiles(options),
    enabled
  })
}

export function useDuplicates(options?: FindDuplicatesOptions, enabled = true) {
  return useQuery({
    queryKey: storageKeys.duplicates(options),
    queryFn: () => electronService.storage().findDuplicates(options),
    enabled
  })
}

export function useAnalyzeStorage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mountPath?: string) => {
      const [drives, usage, largeFiles, duplicates] = await Promise.all([
        electronService.storage().getDrives(),
        electronService.storage().analyzeUsage(mountPath),
        electronService.storage().findLargeFiles(),
        electronService.storage().findDuplicates()
      ])
      return { drives, usage, largeFiles, duplicates }
    },
    onSuccess: (data, mountPath) => {
      queryClient.setQueryData(storageKeys.drives, data.drives)
      queryClient.setQueryData(storageKeys.usage(mountPath), data.usage)
      queryClient.setQueryData(storageKeys.largeFiles(), data.largeFiles)
      queryClient.setQueryData(storageKeys.duplicates(), data.duplicates)
    }
  })
}

export function useRevealInFolder() {
  return useMutation({
    mutationFn: (filePath: string) => electronService.storage().revealInFolder(filePath)
  })
}

export function useDeleteFiles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (filePaths: string[]) => {
      const trashName =
        (await electronService.app().getPlatform()) === 'win32' ? 'Recycle Bin' : 'Trash'
      const confirmed = await electronService.dialog().message({
        type: 'warning',
        title: `Move to ${trashName}`,
        message: `Move ${filePaths.length} item(s) to the ${trashName}?`,
        detail: `You can restore them from the ${trashName} later.`,
        buttons: ['Cancel', `Move to ${trashName}`]
      })

      if (confirmed.response !== 1) {
        return { deleted: [] as string[], failed: [], canceled: true as const }
      }

      const result = await electronService.storage().deleteFiles(filePaths)
      return { ...result, canceled: false as const }
    },
    onSuccess: (result) => {
      if (result.canceled || result.deleted.length === 0) return
      void queryClient.invalidateQueries({ queryKey: ['storage'] })
    }
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { electronService } from '@/services/electron-service'
import type { StartupSetEnabledOptions } from '@shared/interfaces'

export const startupKeys = {
  list: ['startup', 'list'] as const,
  details: (id: string) => ['startup', 'details', id] as const
}

export function useStartupApps() {
  return useQuery({
    queryKey: startupKeys.list,
    queryFn: () => electronService.startup().list(true),
    staleTime: 10_000
  })
}

export function useRefreshStartupApps() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => electronService.startup().list(true),
    onSuccess: (data) => {
      queryClient.setQueryData(startupKeys.list, data)
    }
  })
}

export function useToggleStartupApp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: StartupSetEnabledOptions & { name: string }) => {
      const action = options.enabled ? 'enable' : 'disable'
      const confirmed = await electronService.dialog().message({
        type: 'question',
        title: `${action === 'enable' ? 'Enable' : 'Disable'} startup app?`,
        message: `${action === 'enable' ? 'Enable' : 'Disable'} "${options.name}" at startup?`,
        detail:
          action === 'disable'
            ? 'The entry will be preserved and can be re-enabled later. Nothing is permanently deleted.'
            : 'This app will start again when you sign in.',
        buttons: ['Cancel', action === 'enable' ? 'Enable' : 'Disable']
      })

      if (confirmed.response !== 1) {
        return { success: false as const, cancelled: true as const, error: 'Cancelled' }
      }

      const result = await electronService.startup().setEnabled({
        id: options.id,
        enabled: options.enabled
      })

      return { ...result, cancelled: false as const }
    },
    onSuccess: (result) => {
      if (result.cancelled || !result.success) return
      void queryClient.invalidateQueries({ queryKey: startupKeys.list })
    }
  })
}

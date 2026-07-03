import { useQuery } from '@tanstack/react-query'
import { electronService } from '@/services/electron-service'

export function useAppInfo() {
  return useQuery({
    queryKey: ['app', 'info'],
    queryFn: async () => {
      const [version, platform] = await Promise.all([
        electronService.app().getVersion(),
        electronService.app().getPlatform()
      ])
      return { version, platform }
    }
  })
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ['system', 'info'],
    queryFn: () => electronService.system().getInfo()
  })
}

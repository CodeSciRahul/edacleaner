import { useEffect } from 'react'
import { useAppStore } from '@/store/app-store'
import { Card } from '@/components/ui/Card'
import { useAppInfo, useSystemInfo } from '@/features/home/hooks/useHomeData'
import { formatBytes } from '@shared/utils'

export function HomePage(): React.ReactElement {
  const setReady = useAppStore((state) => state.setReady)
  const { data: appInfo, isLoading: appLoading } = useAppInfo()
  const { data: systemInfo, isLoading: systemLoading } = useSystemInfo()

  useEffect(() => {
    setReady(true)
  }, [setReady])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Welcome</h1>
        <p className="mt-2 text-slate-400">
          Production-ready Electron template with secure IPC architecture.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Application" description="Runtime information from main process">
          {appLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Version</dt>
                <dd className="font-mono text-slate-200">{appInfo?.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Platform</dt>
                <dd className="font-mono text-slate-200">{appInfo?.platform}</dd>
              </div>
            </dl>
          )}
        </Card>

        <Card title="System" description="Host system metrics via IPC">
          {systemLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : systemInfo ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Hostname</dt>
                <dd className="font-mono text-slate-200">{systemInfo.hostname}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">CPUs</dt>
                <dd className="font-mono text-slate-200">{systemInfo.cpuCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Memory</dt>
                <dd className="font-mono text-slate-200">
                  {formatBytes(systemInfo.freeMemory)} free /{' '}
                  {formatBytes(systemInfo.totalMemory)}
                </dd>
              </div>
            </dl>
          ) : null}
        </Card>
      </div>

      <Card title="Architecture" description="Secure communication layers">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <span className="rounded-md bg-slate-800 px-3 py-1">React Renderer</span>
          <span className="text-slate-600">→</span>
          <span className="rounded-md bg-slate-800 px-3 py-1">Preload Bridge</span>
          <span className="text-slate-600">→</span>
          <span className="rounded-md bg-slate-800 px-3 py-1">IPC</span>
          <span className="text-slate-600">→</span>
          <span className="rounded-md bg-slate-800 px-3 py-1">Main Process</span>
        </div>
      </Card>
    </div>
  )
}

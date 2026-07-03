import { useEffect } from 'react'
import { Cpu, HardDrive, Info, Layers } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
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
        <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
        <p className="mt-2 text-muted-foreground">
          Production-ready Electron template with secure IPC architecture.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Application</CardTitle>
            </div>
            <CardDescription>Runtime information from main process</CardDescription>
          </CardHeader>
          <CardContent>
            {appLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Version</dt>
                  <dd>
                    <Badge variant="secondary">{appInfo?.version}</Badge>
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Platform</dt>
                  <dd>
                    <Badge variant="outline">{appInfo?.platform}</Badge>
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">System</CardTitle>
            </div>
            <CardDescription>Host system metrics via IPC</CardDescription>
          </CardHeader>
          <CardContent>
            {systemLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : systemInfo ? (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Hostname</dt>
                  <dd className="font-mono">{systemInfo.hostname}</dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">CPUs</dt>
                  <dd>
                    <Badge variant="secondary">{systemInfo.cpuCount}</Badge>
                  </dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1 text-muted-foreground">
                    <HardDrive className="h-3 w-3" />
                    Memory
                  </dt>
                  <dd className="font-mono text-xs">
                    {formatBytes(systemInfo.freeMemory)} / {formatBytes(systemInfo.totalMemory)}
                  </dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Architecture</CardTitle>
          </div>
          <CardDescription>Secure communication layers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">React Renderer</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline">Preload Bridge</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline">IPC</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline">Main Process</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

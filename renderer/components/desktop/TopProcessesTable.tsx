import { cn } from '@/utils/cn'

interface ProcessRow {
  name: string
  cpu: number
}

interface TopProcessesTableProps {
  processes: ProcessRow[]
  className?: string
}

export function TopProcessesTable({
  processes,
  className
}: TopProcessesTableProps): React.ReactElement {
  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-card', className)}>
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-card-title text-foreground">Top Processes</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Highest CPU usage right now</p>
      </div>
      <div className="divide-y divide-border">
        {processes.map((process) => (
          <div
            key={process.name}
            className="flex items-center justify-between px-6 py-3 text-sm transition-colors hover:bg-muted/40"
          >
            <span className="font-medium text-foreground">{process.name}</span>
            <span className="tabular-nums text-muted-foreground">{process.cpu}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

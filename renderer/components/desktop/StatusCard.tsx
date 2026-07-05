import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface StatusCardProps {
  icon: LucideIcon
  title: string
  status: 'good' | 'warning' | 'critical'
  message: string
  className?: string
}

const statusStyles = {
  good: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  critical: 'bg-destructive/10 text-destructive border-destructive/20'
}

export function StatusCard({
  icon: Icon,
  title,
  status,
  message,
  className
}: StatusCardProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3',
        statusStyles[status],
        className
      )}
    >
      <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs opacity-90">{message}</p>
      </div>
    </div>
  )
}

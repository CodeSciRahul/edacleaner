import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SettingsSectionProps {
  icon: LucideIcon
  title: string
  description: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
  className,
  action
}: SettingsSectionProps): React.ReactElement {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-card',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-300',
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-section-title text-foreground">{title}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

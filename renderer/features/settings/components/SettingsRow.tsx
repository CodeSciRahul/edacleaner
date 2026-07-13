import { cn } from '@/utils/cn'
import { ToggleSwitch } from '@/features/apps/components/ToggleSwitch'

interface SettingsRowProps {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

export function SettingsToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  className
}: SettingsRowProps): React.ReactElement {
  const switchId = `settings-${title.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl border border-transparent px-3 py-3.5',
        'transition-colors duration-150 hover:border-border/80 hover:bg-muted/30',
        className
      )}
    >
      <div className="min-w-0">
        <label htmlFor={switchId} className="text-sm font-medium text-foreground">
          {title}
        </label>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div id={switchId}>
        <ToggleSwitch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          aria-label={title}
        />
      </div>
    </div>
  )
}

interface SettingsInfoRowProps {
  label: string
  value: string
  className?: string
}

export function SettingsInfoRow({
  label,
  value,
  className
}: SettingsInfoRowProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl px-3 py-3',
        'border border-transparent',
        className
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

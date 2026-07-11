import { cn } from '@/utils/cn'

interface ToggleSwitchProps {
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
  'aria-label': string
}

/** Accessible on/off control used by Startup Apps (UI-only). */
export function ToggleSwitch({
  checked,
  disabled,
  onCheckedChange,
  'aria-label': ariaLabel
}: ToggleSwitchProps): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-primary bg-primary' : 'border-border bg-muted'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

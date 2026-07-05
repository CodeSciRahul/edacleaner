import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useThemeStore, type ThemePreference } from '@/store/theme-store'
import { Toolbar } from '@/components/desktop/Toolbar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card'

interface ThemeOption {
  value: ThemePreference
  label: string
  description: string
  icon: typeof Sun
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright surfaces for daytime use',
    icon: Sun
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Soft contrast for low-light environments',
    icon: Moon
  },
  {
    value: 'system',
    label: 'System',
    description: 'Match your operating system',
    icon: Monitor
  }
]

export function SettingsPage(): React.ReactElement {
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)

  return (
    <>
      <Toolbar title="Settings" description="Customize appearance and preferences." />

      <div className="mx-auto max-w-3xl space-y-6 p-content-pad">
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-section-title">Appearance</CardTitle>
            <CardDescription>
              Choose a theme. Changes apply instantly and are saved automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="radiogroup"
              aria-label="Theme preference"
              className="grid gap-4 sm:grid-cols-3"
            >
              {themeOptions.map((option) => {
                const Icon = option.icon
                const selected = preference === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPreference(option.value)}
                    className={cn(
                      'flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border p-6',
                      'text-center outline-none transition-all duration-150 ease-out',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      selected
                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                        : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-150',
                        selected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{option.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                    </div>
                    {selected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

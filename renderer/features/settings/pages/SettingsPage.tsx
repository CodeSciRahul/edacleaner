import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useThemeStore, type ThemePreference } from '@/store/theme-store'
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
  preview: string
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light Mode',
    description: 'Bright, clean surfaces for daytime use.',
    icon: Sun,
    preview: 'bg-[linear-gradient(145deg,#f8fafc_0%,#eef2ff_100%)]'
  },
  {
    value: 'dark',
    label: 'Dark Mode',
    description: 'Soft contrast that stays easy on the eyes.',
    icon: Moon,
    preview: 'bg-[linear-gradient(145deg,#0f172a_0%,#1e293b_100%)]'
  },
  {
    value: 'system',
    label: 'System Theme',
    description: 'Automatically match your operating system.',
    icon: Monitor,
    preview: 'bg-[linear-gradient(135deg,#f8fafc_50%,#0f172a_50%)]'
  }
]

export function SettingsPage(): React.ReactElement {
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Settings</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Customize how EdaCleaner looks and behaves on your desktop.
        </p>
      </header>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg tracking-[-0.02em]">Appearance</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            Choose a theme. Changes apply instantly and are remembered next time you open the app.
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
                    'group relative flex flex-col overflow-hidden rounded-2xl border text-left',
                    'outline-none transition-all duration-200 ease-out',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    selected
                      ? 'border-primary/40 bg-primary/[0.04] shadow-md shadow-primary/10'
                      : 'border-border/70 bg-card hover:border-border hover:shadow-sm'
                  )}
                >
                  <div className={cn('h-20 border-b border-border/50', option.preview)} />

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-200',
                          selected
                            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                            : 'bg-muted text-muted-foreground group-hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                      </div>

                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200',
                          selected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-transparent'
                        )}
                        aria-hidden="true"
                      >
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">
                        {option.label}
                      </p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

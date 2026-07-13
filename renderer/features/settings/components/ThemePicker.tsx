import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useThemeStore, type ThemePreference } from '@/store/theme-store'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

interface ThemeOption {
  value: ThemePreference
  labelKey: TranslationKey
  descriptionKey: TranslationKey
  icon: typeof Sun
  previewClass: string
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    labelKey: 'settings.theme.light',
    descriptionKey: 'settings.theme.lightDesc',
    icon: Sun,
    previewClass: 'from-slate-50 via-white to-blue-50'
  },
  {
    value: 'dark',
    labelKey: 'settings.theme.dark',
    descriptionKey: 'settings.theme.darkDesc',
    icon: Moon,
    previewClass: 'from-slate-900 via-slate-950 to-slate-900'
  },
  {
    value: 'system',
    labelKey: 'settings.theme.system',
    descriptionKey: 'settings.theme.systemDesc',
    icon: Monitor,
    previewClass: 'from-slate-200 via-white to-slate-800'
  }
]

export function ThemePicker(): React.ReactElement {
  const { t } = useTranslation()
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.theme.title')}
      className="grid gap-3 sm:grid-cols-3"
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
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selected
                ? 'border-primary/40 bg-primary/[0.04] shadow-md shadow-primary/10'
                : 'border-border bg-card hover:border-primary/25 hover:shadow-sm'
            )}
          >
            <div
              className={cn(
                'relative h-20 border-b border-border/60 bg-gradient-to-br',
                option.previewClass
              )}
              aria-hidden="true"
            >
              <div className="absolute inset-x-3 bottom-3 flex gap-1.5">
                <span className="h-2 flex-1 rounded-full bg-white/70 shadow-sm dark:bg-white/20" />
                <span className="h-2 w-8 rounded-full bg-primary/70" />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                </div>
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-200',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground scale-100'
                      : 'border-border bg-background scale-90 opacity-0 group-hover:opacity-40'
                  )}
                  aria-hidden="true"
                >
                  {selected ? (
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  ) : null}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t(option.labelKey)}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {t(option.descriptionKey)}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

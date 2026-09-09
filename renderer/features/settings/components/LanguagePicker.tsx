import { Languages } from 'lucide-react'
import { cn } from '@/utils/cn'
import { APP_LANGUAGES, type AppLanguage } from '@/i18n/types'
import { useTranslation } from '@/i18n/useTranslation'
import { SelectedIndicator } from './SelectedIndicator'

export function LanguagePicker(): React.ReactElement {
  const { language, setLanguage, t } = useTranslation()

  return (
    <div
      role="radiogroup"
      aria-label={t('settings.language.title')}
      className="grid gap-3 sm:grid-cols-3"
    >
      {APP_LANGUAGES.map((option) => {
        const selected = language === option.id

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setLanguage(option.id as AppLanguage)}
            className={cn(
              'group relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left',
              'outline-none transition-all duration-200 ease-out',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              selected
                ? 'border-primary/40 bg-primary/[0.04] shadow-md shadow-primary/10'
                : 'border-border bg-card hover:border-primary/25 hover:shadow-sm'
            )}
          >
            <SelectedIndicator selected={selected} />

            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                selected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground group-hover:text-foreground'
              )}
            >
              <Languages className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">{option.nativeLabel}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{option.label}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {t(option.descriptionKey)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

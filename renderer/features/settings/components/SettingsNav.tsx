import { cn } from '@/utils/cn'
import type { SettingsCategory, SettingsCategoryId } from '@/features/settings/lib/settings-meta'
import { useTranslation } from '@/i18n/useTranslation'

interface SettingsNavProps {
  categories: SettingsCategory[]
  activeId: SettingsCategoryId
  onSelect: (id: SettingsCategoryId) => void
}

export function SettingsNav({
  categories,
  activeId,
  onSelect
}: SettingsNavProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('settings.title')}
      className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
    >
      {categories.map((category) => {
        const Icon = category.icon
        const active = category.id === activeId

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex min-w-[148px] items-center gap-3 rounded-xl border px-3.5 py-3 text-left',
              'outline-none transition-all duration-200 ease-out',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'lg:min-w-0 lg:w-full',
              active
                ? 'border-primary/30 bg-primary/[0.08] shadow-sm shadow-primary/5'
                : 'border-transparent bg-transparent hover:border-border/70 hover:bg-accent/40'
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground group-hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  'text-sm font-semibold',
                  active ? 'text-foreground' : 'text-foreground/90'
                )}
              >
                {t(category.labelKey)}
              </p>
              <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
                {t(category.descriptionKey)}
              </p>
            </div>
          </button>
        )
      })}
    </nav>
  )
}

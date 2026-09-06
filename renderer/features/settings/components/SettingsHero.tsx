import { RotateCcw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import settingsHeroBgDark from '@/assets/settings/settings-hero-bg-dark.png'
import settingsHeroBgLight from '@/assets/settings/settings-hero-bg-light.png'

interface SettingsHeroProps {
  categoryLabel: string
  categoryDescription: string
  themeLabel: string
  languageLabel: string
  onReset: () => void
}

export function SettingsHero({
  categoryLabel,
  categoryDescription,
  themeLabel,
  languageLabel,
  onReset
}: SettingsHeroProps): React.ReactElement {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('settings.hero.overview')}
      className="relative min-h-[15.5rem] overflow-hidden rounded-2xl border border-border bg-[#d7ebf8] p-6 shadow-card sm:min-h-[17.5rem] sm:p-7 animate-in fade-in-0 duration-300 dark:bg-[#0f1a2c]"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl" aria-hidden="true">
        <img
          src={settingsHeroBgLight}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-right dark:hidden"
          draggable={false}
        />
        <img
          src={settingsHeroBgDark}
          alt=""
          className="absolute inset-0 hidden h-full w-full object-cover object-right dark:block"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-card/80 via-card/45 to-transparent sm:via-card/28" />
      </div>

      <div className="relative z-10 flex min-h-[inherit] flex-col justify-center gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1',
                'text-[11px] font-semibold uppercase tracking-wide text-primary backdrop-blur-sm'
              )}
            >
              <Settings2 className="h-3 w-3" aria-hidden="true" />
              {t('settings.hero.badge')}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('settings.preferences')}
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {t('settings.hero.title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t('settings.hero.message')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatPill label={t('settings.hero.section')} value={categoryLabel} />
            <StatPill label={t('settings.theme.title')} value={themeLabel} />
            <StatPill label={t('settings.language.title')} value={languageLabel} />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-2 rounded-lg border-border/80 bg-background/70 px-3 text-[13px] backdrop-blur-sm"
              onClick={onReset}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('settings.reset')}
            </Button>
            <p className="text-xs text-muted-foreground">{categoryDescription}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/80 bg-background/60 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

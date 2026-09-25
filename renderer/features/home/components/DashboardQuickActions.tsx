import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import iconScan from '@/assets/dashboard/icon-smart-scan.png'
import iconCleanup from '@/assets/dashboard/icon-cleanup.png'
import iconBoost from '@/assets/dashboard/icon-boost.png'
import iconStorage from '@/assets/dashboard/icon-storage.png'

type ActionAccent = 'scan' | 'cleanup' | 'boost' | 'storage'

interface ActionItem {
  id: string
  iconSrc: string
  titleKey: TranslationKey
  descKey: TranslationKey
  actionKey: TranslationKey
  href: string
  accent: ActionAccent
}

const ACCENT_STYLES: Record<
  ActionAccent,
  {
    wash: string
    orb: string
    iconWrap: string
    cta: string
    ringHover: string
  }
> = {
  scan: {
    wash: 'from-primary/20 via-primary/5 to-transparent',
    orb: 'bg-primary/20',
    iconWrap: 'bg-primary/10 ring-1 ring-primary/15',
    cta: 'bg-primary/10 text-primary group-hover:bg-primary/15',
    ringHover:
      'hover:border-primary/40 hover:shadow-[0_18px_40px_-16px_rgba(37,99,235,0.35)]'
  },
  cleanup: {
    wash: 'from-chart-disk/25 via-chart-disk/5 to-transparent',
    orb: 'bg-chart-disk/20',
    iconWrap: 'bg-chart-disk/10 ring-1 ring-chart-disk/15',
    cta: 'bg-chart-disk/10 text-chart-disk group-hover:bg-chart-disk/15',
    ringHover:
      'hover:border-chart-disk/40 hover:shadow-[0_18px_40px_-16px_rgba(139,92,246,0.4)]'
  },
  boost: {
    wash: 'from-warning/20 via-warning/5 to-transparent',
    orb: 'bg-warning/25',
    iconWrap: 'bg-warning/10 ring-1 ring-warning/15',
    cta: 'bg-warning/10 text-warning group-hover:bg-warning/15',
    ringHover:
      'hover:border-warning/40 hover:shadow-[0_18px_40px_-16px_rgba(245,158,11,0.4)]'
  },
  storage: {
    wash: 'from-chart-ram/25 via-chart-ram/5 to-transparent',
    orb: 'bg-chart-ram/20',
    iconWrap: 'bg-chart-ram/10 ring-1 ring-chart-ram/15',
    cta: 'bg-chart-ram/10 text-chart-ram group-hover:bg-chart-ram/15',
    ringHover:
      'hover:border-chart-ram/40 hover:shadow-[0_18px_40px_-16px_rgba(6,182,212,0.4)]'
  }
}

const ACTIONS: ActionItem[] = [
  {
    id: 'scan',
    iconSrc: iconScan,
    titleKey: 'home.action.scanTitle',
    descKey: 'home.action.scanDesc',
    actionKey: 'home.scanNow',
    href: '/smart-scan',
    accent: 'scan'
  },
  {
    id: 'cleanup',
    iconSrc: iconCleanup,
    titleKey: 'home.junkTitle',
    descKey: 'home.junkDesc',
    actionKey: 'home.junkAction',
    href: '/cleanup',
    accent: 'cleanup'
  },
  {
    id: 'boost',
    iconSrc: iconBoost,
    titleKey: 'home.ramTitle',
    descKey: 'home.ramDesc',
    actionKey: 'home.ramAction',
    href: '/performance',
    accent: 'boost'
  },
  {
    id: 'storage',
    iconSrc: iconStorage,
    titleKey: 'home.action.storageTitle',
    descKey: 'home.action.storageDesc',
    actionKey: 'home.action.storageAction',
    href: '/storage',
    accent: 'storage'
  }
]

export function DashboardQuickActions(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section aria-label={t('home.quickActions')}>
      <div className="mb-4">
        <h2 className="text-section-title text-foreground">{t('home.quickActions')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('home.quickActionsHint')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map(({ id, iconSrc, titleKey, descKey, actionKey, href, accent }) => {
          const style = ACCENT_STYLES[accent]

          return (
            <button
              key={id}
              type="button"
              onClick={() => navigate(href)}
              className={cn(
                'group relative flex min-h-[188px] flex-col overflow-hidden rounded-2xl border border-border',
                'bg-card text-left shadow-card',
                'transition-all duration-200 ease-out hover:-translate-y-1',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                style.ringHover
              )}
            >
              <div
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b',
                  style.wash
                )}
                aria-hidden="true"
              />
              <div
                className={cn(
                  'pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full blur-2xl',
                  'opacity-70 transition-opacity duration-200 group-hover:opacity-100',
                  style.orb
                )}
                aria-hidden="true"
              />

              <div className="relative z-10 flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-105',
                      style.iconWrap
                    )}
                  >
                    <img
                      src={iconSrc}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 object-contain drop-shadow-sm"
                      draggable={false}
                      aria-hidden="true"
                    />
                  </div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/60 text-muted-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100">
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-4 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {t(descKey)}
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      style.cta
                    )}
                  >
                    {t(actionKey)}
                    <ArrowRight
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

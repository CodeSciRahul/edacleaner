import { useNavigate } from 'react-router-dom'
import {
  HardDrive,
  ScanSearch,
  Sparkles,
  Trash2,
  Zap,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

interface ActionItem {
  id: string
  icon: LucideIcon
  titleKey: TranslationKey
  descKey: TranslationKey
  actionKey: TranslationKey
  href: string
  wrap: string
}

const ACTIONS: ActionItem[] = [
  {
    id: 'scan',
    icon: ScanSearch,
    titleKey: 'home.action.scanTitle',
    descKey: 'home.action.scanDesc',
    actionKey: 'home.scanNow',
    href: '/smart-scan',
    wrap: 'bg-primary/10 text-primary'
  },
  {
    id: 'cleanup',
    icon: Trash2,
    titleKey: 'home.junkTitle',
    descKey: 'home.junkDesc',
    actionKey: 'home.junkAction',
    href: '/cleanup',
    wrap: 'bg-chart-disk/10 text-chart-disk'
  },
  {
    id: 'boost',
    icon: Zap,
    titleKey: 'home.ramTitle',
    descKey: 'home.ramDesc',
    actionKey: 'home.ramAction',
    href: '/performance',
    wrap: 'bg-warning/10 text-warning'
  },
  {
    id: 'storage',
    icon: HardDrive,
    titleKey: 'home.action.storageTitle',
    descKey: 'home.action.storageDesc',
    actionKey: 'home.action.storageAction',
    href: '/storage',
    wrap: 'bg-chart-ram/10 text-chart-ram'
  }
]

export function DashboardQuickActions(): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section aria-label={t('home.quickActions')}>
      <div className="mb-4">
        <h2 className="text-section-title text-foreground">{t('home.quickActions')}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('home.quickActionsHint')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map(({ id, icon: Icon, titleKey, descKey, actionKey, href, wrap }) => (
          <button
            key={id}
            type="button"
            onClick={() => navigate(href)}
            className={cn(
              'group flex flex-col rounded-2xl border border-border bg-card p-5 text-left shadow-card',
              'outline-none transition-all duration-200',
              'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            <div
              className={cn(
                'mb-4 flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                wrap
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-foreground">{t(titleKey)}</p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
              {t(descKey)}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              {t(actionKey)}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

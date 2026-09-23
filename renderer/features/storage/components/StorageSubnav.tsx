import { NavLink } from 'react-router-dom'
import { Copy, FileStack, HardDrive } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

const links: Array<{
  to: string
  labelKey: TranslationKey
  icon: typeof HardDrive
  end: boolean
}> = [
  {
    to: '/storage',
    labelKey: 'storage.subnav.overview',
    icon: HardDrive,
    end: true
  },
  {
    to: '/storage/large-files',
    labelKey: 'storage.subnav.largeFiles',
    icon: FileStack,
    end: false
  },
  {
    to: '/storage/duplicates',
    labelKey: 'storage.subnav.duplicates',
    icon: Copy,
    end: false
  }
]

export function StorageSubnav(): React.ReactElement {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('storage.title')}
      className="flex gap-1 rounded-2xl border border-border/80 bg-muted/35 p-1.5 shadow-sm"
    >
      {links.map((link) => {
        const Icon = link.icon
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t(link.labelKey)}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { sidebarNavItems } from '@/components/layout/sidebar-nav'
import { Toolbar } from '@/components/desktop/Toolbar'
import { EmptyState } from '@/components/desktop/EmptyState'
import { useTranslation } from '@/i18n/useTranslation'

export function ModulePlaceholder(): React.ReactElement {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const item = sidebarNavItems.find((nav) => nav.href === pathname)
  const title = item ? t(item.labelKey) : t('common.module')
  const description = item ? t(item.descriptionKey) : undefined

  return (
    <>
      <Toolbar title={title} description={description} />
      <div className="p-content-pad">
        <EmptyState
          icon={Construction}
          title={t('common.comingSoon', { title })}
          description={t('common.modulePlaceholder')}
        />
      </div>
    </>
  )
}

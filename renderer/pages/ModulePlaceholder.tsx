import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { sidebarNavItems } from '@/components/layout/sidebar-nav'
import { Toolbar } from '@/components/desktop/Toolbar'
import { EmptyState } from '@/components/desktop/EmptyState'

export function ModulePlaceholder(): React.ReactElement {
  const { pathname } = useLocation()
  const item = sidebarNavItems.find((nav) => nav.href === pathname)
  const title = item?.label ?? 'Module'

  return (
    <>
      <Toolbar title={title} description={item?.description} />
      <div className="p-content-pad">
        <EmptyState
          icon={Construction}
          title={`${title} coming soon`}
          description="This module will plug into the existing shell without restructuring the application."
        />
      </div>
    </>
  )
}

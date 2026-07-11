import { NavLink } from 'react-router-dom'
import { Copy, FileStack, HardDrive } from 'lucide-react'
import { cn } from '@/utils/cn'

const links = [
  {
    to: '/storage',
    label: 'Overview',
    icon: HardDrive,
    end: true
  },
  {
    to: '/storage/large-files',
    label: 'Large Files',
    icon: FileStack,
    end: false
  },
  {
    to: '/storage/duplicates',
    label: 'Duplicates',
    icon: Copy,
    end: false
  }
] as const

export function StorageSubnav(): React.ReactElement {
  return (
    <nav
      aria-label="Storage sections"
      className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1"
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
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{link.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

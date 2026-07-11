import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Crumb {
  label: string
  href?: string
}

interface PageBreadcrumbProps {
  items: Crumb[]
  className?: string
}

export function PageBreadcrumb({ items, className }: PageBreadcrumbProps): React.ReactElement {
  return (
    <nav aria-label="Breadcrumb" className={cn('mb-3', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3 w-3 opacity-60" aria-hidden="true" /> : null}
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && 'font-medium text-foreground')}>{item.label}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

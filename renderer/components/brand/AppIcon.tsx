import { cn } from '@/utils/cn'
import appIconUrl from '@/assets/brand/app-icon.svg'

type AppIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const sizeClass: Record<AppIconSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
  xl: 'h-14 w-14'
}

interface AppIconProps {
  size?: AppIconSize
  className?: string
  alt?: string
  decorative?: boolean
}

/** Product mark (rounded blue tile). Prefer this for chrome, nav, and compact surfaces. */
export function AppIcon({
  size = 'md',
  className,
  alt = 'EDA Cleaner',
  decorative = true
}: AppIconProps): React.ReactElement {
  return (
    <img
      src={appIconUrl}
      alt={decorative ? '' : alt}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={cn('shrink-0 select-none rounded-[22%] object-contain', sizeClass[size], className)}
    />
  )
}

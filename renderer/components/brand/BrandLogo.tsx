import { APP_NAME } from '@shared/constants'
import { cn } from '@/utils/cn'
import { AppIcon } from '@/components/brand/AppIcon'
import logoHorizontalBlue from '@/assets/brand/logo-horizontal-blue.png'
import logoHorizontalLight from '@/assets/brand/logo-horizontal.svg'

type BrandLogoSize = 'sm' | 'md' | 'lg'

const layout: Record<
  BrandLogoSize,
  { icon: 'sm' | 'md' | 'lg'; text: string; gap: string; wordmarkH: string }
> = {
  sm: { icon: 'sm', text: 'text-[13px]', gap: 'gap-2', wordmarkH: 'h-5' },
  md: { icon: 'md', text: 'text-sm', gap: 'gap-2.5', wordmarkH: 'h-6' },
  lg: { icon: 'lg', text: 'text-base', gap: 'gap-3', wordmarkH: 'h-8' }
}

interface BrandLogoProps {
  size?: BrandLogoSize
  /** Show app name text next to the mark (default). */
  showWordmark?: boolean
  /**
   * `mark` — icon + optional text (UI chrome).
   * `horizontal` — full lockup image (about / splash / marketing surfaces).
   */
  variant?: 'mark' | 'horizontal'
  className?: string
  tagline?: string
}

/**
 * Brand lockup for headers, about, and empty/marketing surfaces.
 * Uses the SVG app icon for sharp high-DPI rendering in chrome;
 * theme-aware horizontal lockups for larger brand moments.
 */
export function BrandLogo({
  size = 'md',
  showWordmark = true,
  variant = 'mark',
  className,
  tagline
}: BrandLogoProps): React.ReactElement {
  const s = layout[size]

  if (variant === 'horizontal') {
    return (
      <div className={cn('inline-flex flex-col items-start', className)}>
        <span className="relative inline-flex items-center">
          {/* Light UI: blue lockup */}
          <img
            src={logoHorizontalBlue}
            alt={APP_NAME}
            draggable={false}
            className={cn(
              'w-auto select-none object-contain object-left dark:hidden',
              s.wordmarkH
            )}
          />
          {/* Dark UI: light lockup */}
          <img
            src={logoHorizontalLight}
            alt=""
            aria-hidden
            draggable={false}
            className={cn(
              'hidden w-auto select-none object-contain object-left dark:block',
              s.wordmarkH
            )}
          />
        </span>
        {tagline ? (
          <p className="mt-1.5 text-[11px] text-muted-foreground">{tagline}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={cn('inline-flex min-w-0 items-center', s.gap, className)}>
      <AppIcon size={s.icon} />
      {showWordmark ? (
        <div className="min-w-0">
          <p className={cn('truncate font-semibold tracking-tight text-foreground', s.text)}>
            {APP_NAME}
          </p>
          {tagline ? (
            <p className="truncate text-[11px] text-muted-foreground">{tagline}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

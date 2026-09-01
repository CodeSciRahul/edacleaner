import type { ReactNode } from 'react'
import { TitleBar } from '@/components/desktop/TitleBar'
import { cn } from '@/utils/cn'

interface WindowFrameProps {
  children: ReactNode
  variant?: 'app' | 'simple' | 'overlay'
  accessory?: ReactNode
  className?: string
}

export function WindowFrame({
  children,
  variant = 'simple',
  accessory,
  className
}: WindowFrameProps): React.ReactElement {
  if (variant === 'overlay') {
    return (
      <div className={cn('relative flex h-full min-h-0 flex-col overflow-hidden bg-[#d7eaf6]', className)}>
        <div className="absolute inset-x-0 top-0 z-20">
          <TitleBar variant="overlay" accessory={accessory} />
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden bg-background', className)}>
      <TitleBar variant={variant} accessory={accessory} />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

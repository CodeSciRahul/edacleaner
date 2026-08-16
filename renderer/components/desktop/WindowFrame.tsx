import type { ReactNode } from 'react'
import { TitleBar } from '@/components/desktop/TitleBar'
import { cn } from '@/utils/cn'

interface WindowFrameProps {
  children: ReactNode
  variant?: 'app' | 'simple'
  accessory?: ReactNode
  className?: string
}

export function WindowFrame({
  children,
  variant = 'simple',
  accessory,
  className
}: WindowFrameProps): React.ReactElement {
  return (
    <div className={cn('flex h-full min-h-0 flex-col overflow-hidden bg-background', className)}>
      <TitleBar variant={variant} accessory={accessory} />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

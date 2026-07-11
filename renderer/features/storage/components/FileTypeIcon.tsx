import { getFileTypeIcon } from '../lib/file-type'
import { cn } from '@/utils/cn'

interface FileTypeIconProps {
  fileName: string
  className?: string
  iconClassName?: string
}

export function FileTypeIcon({
  fileName,
  className,
  iconClassName
}: FileTypeIconProps): React.ReactElement {
  const Icon = getFileTypeIcon(fileName)
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary',
        className
      )}
    >
      <Icon className={cn('h-4 w-4', iconClassName)} strokeWidth={1.75} aria-hidden="true" />
    </div>
  )
}

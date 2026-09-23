import { getFileCategory, getFileTypeIcon, type FileCategory } from '../lib/file-type'
import { cn } from '@/utils/cn'

const CATEGORY_STYLES: Record<FileCategory, string> = {
  videos: 'bg-chart-disk/15 text-chart-disk ring-chart-disk/25',
  images: 'bg-success/12 text-success ring-success/25',
  documents: 'bg-primary/12 text-primary ring-primary/25',
  archives: 'bg-warning/12 text-warning ring-warning/25',
  executables: 'bg-chart-ram/15 text-chart-ram ring-chart-ram/25',
  other: 'bg-muted/80 text-muted-foreground ring-border/60'
}

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
  const category = getFileCategory(fileName)
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1',
        CATEGORY_STYLES[category],
        className
      )}
    >
      <Icon className={cn('h-4 w-4', iconClassName)} strokeWidth={1.75} aria-hidden="true" />
    </div>
  )
}

import { Search } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import {
  FILE_CATEGORY_CHIPS,
  FILE_CATEGORY_LABELS,
  type FileCategory
} from '../lib/file-type'

interface StorageFilterBarProps {
  query: string
  onQueryChange: (value: string) => void
  pathFilter: string
  onPathFilterChange: (value: string) => void
  category: FileCategory | 'all'
  onCategoryChange: (value: FileCategory | 'all') => void
  sortKey: string
  sortOptions: Array<{ value: string; label: string }>
  onSortKeyChange: (value: string) => void
  searchPlaceholder?: string
  className?: string
  children?: React.ReactNode
}

export function StorageFilterBar({
  query,
  onQueryChange,
  pathFilter,
  onPathFilterChange,
  category,
  onCategoryChange,
  sortKey,
  sortOptions,
  onSortKeyChange,
  searchPlaceholder = 'Search by filename…',
  className,
  children
}: StorageFilterBarProps): React.ReactElement {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search by filename"
          />
        </div>
        <input
          type="search"
          value={pathFilter}
          onChange={(e) => onPathFilterChange(e.target.value)}
          placeholder="Filter by folder path…"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring lg:max-w-xs"
          aria-label="Filter by folder path"
        />
        <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground">
          <span className="shrink-0">Sort</span>
          <select
            className="bg-transparent text-sm text-foreground outline-none"
            value={sortKey}
            onChange={(e) => onSortKeyChange(e.target.value)}
            aria-label="Sort results"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        {children}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip
          active={category === 'all'}
          onClick={() => onCategoryChange('all')}
          label="All types"
        />
        {FILE_CATEGORY_CHIPS.map((chip) => (
          <Chip
            key={chip}
            active={category === chip}
            onClick={() => onCategoryChange(chip)}
            label={FILE_CATEGORY_LABELS[chip]}
          />
        ))}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  label
}: {
  active: boolean
  onClick: () => void
  label: string
}): React.ReactElement {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      className={cn('h-7 rounded-full px-3 text-xs', !active && 'bg-card')}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </Button>
  )
}

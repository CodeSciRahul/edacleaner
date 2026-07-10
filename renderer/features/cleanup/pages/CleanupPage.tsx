import { useEffect, useState } from 'react'
import { Sparkles, Trash2, Clock, Recycle, Globe, Database } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Toolbar } from '@/components/desktop/Toolbar'
import { StatusCard } from '@/components/desktop/StatusCard'
import { cn } from '@/utils/cn'
import { useElectron } from '@/hooks/useElectron'

interface CleanupCategory {
  id: string
  label: string
  description: string
  icon: LucideIcon
  size: string
  items: number
  risk: 'safe' | 'review'
}

const cleanupCategories: CleanupCategory[] = [
  {
    id: 'junk',
    label: 'Junk Files',
    description: 'Leftover installers, logs, and app debris',
    icon: Trash2,
    size: '1.8 GB',
    items: 342,
    risk: 'safe'
  },
  {
    id: 'temp',
    label: 'Temporary Files',
    description: 'Windows and application temp folders',
    icon: Clock,
    size: '940 MB',
    items: 128,
    risk: 'safe'
  },
  {
    id: 'recycle',
    label: 'Recycle Bin',
    description: 'Deleted files waiting for permanent removal',
    icon: Recycle,
    size: '2.1 GB',
    items: 56,
    risk: 'safe'
  },
  {
    id: 'browser',
    label: 'Browser Cache',
    description: 'Chrome, Edge, and Firefox cached data',
    icon: Globe,
    size: '620 MB',
    items: 4,
    risk: 'safe'
  },
  {
    id: 'system',
    label: 'System Cache',
    description: 'Windows update and thumbnail caches',
    icon: Database,
    size: '410 MB',
    items: 19,
    risk: 'review'
  }
]

export function CleanupPage(): React.ReactElement {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(cleanupCategories.map((c) => c.id))
  )
  const {customApi} = useElectron()
  useEffect(() => {
    async function test() {
      await customApi().helloWorld()
    }
    test()
  }, [customApi])

  const totalSize = '5.9 GB'
  const selectedCount = selected.size

  function toggleCategory(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <>
      <Toolbar
        title="Cleanup"
        description="Remove junk and clutter to reclaim disk space."
        actions={
          <Button size="sm" className="h-9 gap-2 rounded-lg px-4 text-[13px]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Clean {selectedCount > 0 ? `(${selectedCount})` : ''}
          </Button>
        }
      />

      <div className="space-y-6 p-content-pad">
        <StatusCard
          icon={Sparkles}
          title="Cleanup Ready"
          status="good"
          message={`Up to ${totalSize} of reclaimable space found across ${cleanupCategories.length} categories.`}
        />

        <section aria-label="Cleanup categories">
          <h2 className="mb-4 text-section-title text-foreground">Categories</h2>
          <div className="space-y-3">
            {cleanupCategories.map((category) => {
              const Icon = category.icon
              const isSelected = selected.has(category.id)

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border p-4 text-left',
                    'outline-none transition-all duration-150 ease-out',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected
                      ? 'border-primary/30 bg-primary/[0.04] shadow-sm'
                      : 'border-border bg-card hover:border-border hover:bg-accent/30'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{category.label}</p>
                      <Badge variant={category.risk === 'safe' ? 'secondary' : 'outline'}>
                        {category.risk === 'safe' ? 'Safe' : 'Review'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {category.size}
                    </p>
                    <p className="text-xs text-muted-foreground">{category.items} items</p>
                  </div>

                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                      isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                        <path d="M10.28 2.28a1 1 0 0 1 0 1.42l-5.5 5.5a1 1 0 0 1-1.42 0l-2.5-2.5a1 1 0 1 1 1.42-1.42L4.5 7.08l4.79-4.8a1 1 0 0 1 1.42 0z" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}

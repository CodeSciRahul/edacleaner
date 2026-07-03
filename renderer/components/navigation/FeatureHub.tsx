import { useState } from 'react'
import { Construction } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { FeatureItem, FeatureSection } from '@/features/sections/feature-sections'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card'

interface FeatureHubProps {
  section: FeatureSection
}

export function FeatureHub({ section }: FeatureHubProps): React.ReactElement {
  const [activeId, setActiveId] = useState(section.features[0]?.id ?? '')
  const activeFeature = section.features.find((feature) => feature.id === activeId)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">
          {section.title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {section.description}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={`${section.title} tools`}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {section.features.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            active={feature.id === activeId}
            onSelect={() => setActiveId(feature.id)}
          />
        ))}
      </div>

      {activeFeature && (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="gap-4 py-10 sm:flex-row sm:items-center sm:py-8">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                'bg-primary/10 text-primary'
              )}
            >
              <Construction className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-lg tracking-[-0.02em]">{activeFeature.label}</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {activeFeature.description} This module is ready to be connected to the cleaning
                engine without changing the app shell.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

interface FeatureCardProps {
  feature: FeatureItem
  active: boolean
  onSelect: () => void
}

function FeatureCard({ feature, active, onSelect }: FeatureCardProps): React.ReactElement {
  const Icon = feature.icon

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'group flex min-h-[112px] flex-col items-start gap-3 rounded-2xl border p-4 text-left',
        'outline-none transition-all duration-200 ease-out',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active
          ? 'border-primary/30 bg-primary/[0.06] shadow-sm shadow-primary/10'
          : 'border-border/70 bg-card hover:border-border hover:bg-accent/40 hover:shadow-sm'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition-colors duration-200',
          active
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
            : 'bg-muted text-muted-foreground group-hover:text-foreground'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">{feature.label}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{feature.description}</p>
      </div>
    </button>
  )
}

export function ReportsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6 animate-in fade-in-0 duration-300" aria-hidden="true">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-[220px] animate-pulse rounded-2xl border border-border bg-muted/40" />
        <div className="grid gap-4">
          <div className="h-[100px] animate-pulse rounded-2xl border border-border bg-muted/40" />
          <div className="h-[100px] animate-pulse rounded-2xl border border-border bg-muted/40" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] animate-pulse rounded-2xl border border-border bg-muted/40"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-[240px] animate-pulse rounded-2xl border border-border bg-muted/40" />
        <div className="h-[240px] animate-pulse rounded-2xl border border-border bg-muted/40" />
      </div>
    </div>
  )
}

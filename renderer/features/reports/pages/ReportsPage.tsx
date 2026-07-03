import { BarChart3 } from 'lucide-react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card'

export function ReportsPage(): React.ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">Reports</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Review cleanup history, space recovered, and performance trends over time.
        </p>
      </header>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="items-center gap-4 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <BarChart3 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-lg tracking-[-0.02em]">No reports yet</CardTitle>
            <CardDescription className="mx-auto max-w-md text-sm leading-relaxed">
              After your first scan or cleanup, insights and history will appear here.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

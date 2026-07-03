import { ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card'

export function SmartScanPage(): React.ReactElement {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-8">
      <header className="space-y-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">
          Smart Scan
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Run a one-click health check across junk, storage, and performance issues.
        </p>
      </header>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="gap-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScanSearch className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-lg tracking-[-0.02em]">Ready to scan</CardTitle>
              <CardDescription className="max-w-md text-sm leading-relaxed">
                Smart Scan will analyze your system and recommend the safest optimizations first.
              </CardDescription>
            </div>
          </div>

          <Button className="h-10 rounded-xl px-5 font-semibold shadow-sm shadow-primary/20">
            Start Smart Scan
          </Button>
        </CardHeader>
      </Card>
    </div>
  )
}

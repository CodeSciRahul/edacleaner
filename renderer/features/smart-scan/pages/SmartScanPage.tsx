import { ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/Card'

export function SmartScanPage(): React.ReactElement {
  return (
    <>
      <Toolbar
        title="Smart Scan"
        description="One-click health check across junk, storage, and performance."
      />

      <div className="p-content-pad">
        <Card className="border-border shadow-card">
          <CardHeader className="gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ScanSearch className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-card-title">Ready to scan</CardTitle>
                <CardDescription className="max-w-md">
                  Smart Scan analyzes your system and recommends the safest optimizations first.
                </CardDescription>
              </div>
            </div>
            <Button className="h-9 shrink-0 rounded-lg px-4 text-[13px]">Start Smart Scan</Button>
          </CardHeader>
        </Card>
      </div>
    </>
  )
}

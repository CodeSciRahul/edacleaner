import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { TopProcessesTable } from '@/components/desktop/TopProcessesTable'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/i18n/useTranslation'

interface DashboardTopProcessesProps {
  processes: Array<{ name: string; memoryBytes: number }>
  isLoading: boolean
}

export function DashboardTopProcesses({
  processes,
  isLoading
}: DashboardTopProcessesProps): React.ReactElement {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section aria-label={t('processes.title')} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-section-title text-foreground">{t('home.processesTitle')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('home.processesHint')}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs"
          onClick={() => navigate('/performance')}
        >
          {t('home.openPerformance')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>

      {isLoading && processes.length === 0 ? (
        <div className="h-[220px] animate-pulse rounded-xl border border-border bg-muted/40" />
      ) : (
        <TopProcessesTable processes={processes} />
      )}
    </section>
  )
}

import { Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui/Button'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { useTranslation } from '@/i18n/useTranslation'

interface SidebarUpgradeCardProps {
  collapsed: boolean
}

export function SidebarUpgradeCard({
  collapsed
}: SidebarUpgradeCardProps): React.ReactElement | null {
  const { t } = useTranslation()
  const plan = useEntitlementsStore((s) => s.plan)
  const openPlansModal = useEntitlementsStore((s) => s.openPlansModal)

  if (plan === 'premium') return null

  if (collapsed) {
    return (
      <button
        type="button"
        title={t('sidebar.premium')}
        aria-label={t('sidebar.premium')}
        onClick={openPlansModal}
        className={cn(
          'mx-auto flex h-11 w-11 items-center justify-center rounded-lg',
          'bg-primary/10 text-primary outline-none transition-colors duration-150',
          'hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring'
        )}
      >
        <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-muted p-3">
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground">{t('sidebar.premium')}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {t('sidebar.premiumDesc')}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        className="mt-3 h-8 w-full rounded-lg text-[13px]"
        onClick={openPlansModal}
      >
        {t('sidebar.upgrade')}
      </Button>
    </div>
  )
}

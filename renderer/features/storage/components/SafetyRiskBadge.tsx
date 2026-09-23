import { ShieldAlert, ShieldBan, TriangleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { FileSafetyInfo, FileSafetyRiskLevel } from '@shared/interfaces'

const RISK_STYLES: Record<
  Exclude<FileSafetyRiskLevel, 'SAFE'>,
  { className: string; Icon: typeof ShieldBan; labelKey: string }
> = {
  PROTECTED: {
    className: 'bg-destructive/10 text-destructive',
    Icon: ShieldBan,
    labelKey: 'storage.safety.protected'
  },
  HIGH_RISK: {
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    Icon: ShieldAlert,
    labelKey: 'storage.safety.highRisk'
  },
  CAUTION: {
    className: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
    Icon: TriangleAlert,
    labelKey: 'storage.safety.caution'
  }
}

export function SafetyRiskBadge({
  safety,
  label
}: {
  safety: FileSafetyInfo
  /** Already-translated short label */
  label: string
}): React.ReactElement | null {
  if (safety.riskLevel === 'SAFE') return null
  const style = RISK_STYLES[safety.riskLevel]
  const Icon = style.Icon

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        style.className
      )}
      title={safety.reason}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  )
}

export function isDeletableSafety(safety: FileSafetyInfo | undefined): boolean {
  return safety?.deletionAllowed !== false
}

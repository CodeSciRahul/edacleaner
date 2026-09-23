import { ShieldAlert, ShieldBan, TriangleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { FileSafetyInfo, FileSafetyRiskLevel } from '@shared/interfaces'

const RISK_STYLES: Record<
  Exclude<FileSafetyRiskLevel, 'SAFE'>,
  { className: string; Icon: typeof ShieldBan; labelKey: string }
> = {
  PROTECTED: {
    className: 'bg-destructive/12 text-destructive ring-1 ring-destructive/20',
    Icon: ShieldBan,
    labelKey: 'storage.safety.protected'
  },
  HIGH_RISK: {
    className: 'bg-warning/12 text-warning ring-1 ring-warning/20',
    Icon: ShieldAlert,
    labelKey: 'storage.safety.highRisk'
  },
  CAUTION: {
    className: 'bg-warning/10 text-warning ring-1 ring-warning/15',
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
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
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

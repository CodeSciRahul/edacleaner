import { Gauge, HardDrive, ScanSearch, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { APP_NAME } from '@shared/constants'
import { cn } from '@/utils/cn'
import { useTranslation } from '@/i18n/useTranslation'
import appIcon from '@/assets/app logo/App Icon3.svg'

export type ProductStageVariant = 'welcome' | 'value' | 'features' | 'license' | 'account' | 'ready'

interface ProductStageProps {
  variant: ProductStageVariant
  /** Swap in a real EDA Cleaner screenshot without changing layout. */
  imageSrc?: string
  imageAlt?: string
}

function WindowChrome({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div
      className={cn(
        'relative w-full max-w-[520px] overflow-hidden rounded-xl border border-border/80',
        'bg-card shadow-[0_18px_40px_-18px_rgb(15_23_42_/_0.35)]',
        'animate-in fade-in-0 zoom-in-95 duration-300'
      )}
    >
      <div className="flex h-9 items-center gap-2 border-b border-border/70 bg-muted/40 px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-2 truncate text-[11px] font-medium text-muted-foreground">{APP_NAME}</span>
      </div>
      {children}
    </div>
  )
}

function WelcomePreview(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <WindowChrome>
      <div className="flex min-h-[280px]">
        <div className="hidden w-[72px] shrink-0 flex-col gap-2 border-r border-border/70 bg-sidebar p-2.5 sm:flex">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <img src={appIcon} alt="" className="h-5 w-5" />
          </div>
          {[ScanSearch, Trash2, HardDrive, Gauge].map((Icon, i) => (
            <div
              key={i}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                i === 0 ? 'bg-sidebar-active text-sidebar-active-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('onboarding.preview.overview')}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{t('onboarding.preview.health')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('onboarding.preview.cpu'), value: '18%' },
              { label: t('onboarding.preview.memory'), value: '42%' },
              { label: t('onboarding.preview.storage'), value: '64%' }
            ].map((metric) => (
              <div key={metric.label} className="rounded-lg border border-border/80 bg-muted/30 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground">{metric.label}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{metric.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-1 items-end rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <p className="text-xs font-medium text-foreground">{t('onboarding.preview.scanReady')}</p>
            </div>
          </div>
        </div>
      </div>
    </WindowChrome>
  )
}

function ValuePreview(): React.ReactElement {
  const { t } = useTranslation()
  const rows = [
    { label: t('onboarding.preview.temp'), size: '1.2 GB' },
    { label: t('onboarding.preview.browser'), size: '860 MB' },
    { label: t('onboarding.preview.recycle'), size: '410 MB' }
  ]
  return (
    <WindowChrome>
      <div className="min-h-[280px] space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{t('onboarding.preview.cleanup')}</p>
            <p className="text-[11px] text-muted-foreground">{t('onboarding.preview.reclaim')}</p>
          </div>
          <Trash2 className="h-4 w-4 text-primary" strokeWidth={1.75} />
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5"
            >
              <span className="text-xs font-medium text-foreground">{row.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{row.size}</span>
            </div>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[68%] rounded-full bg-primary" />
        </div>
      </div>
    </WindowChrome>
  )
}

function FeaturesPreview(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <WindowChrome>
      <div className="grid min-h-[280px] grid-cols-2 gap-3 p-4">
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
          <ScanSearch className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <p className="mt-2 text-xs font-semibold text-foreground">{t('nav.smartScan')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t('onboarding.preview.smartScan')}
          </p>
        </div>
        <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
          <Gauge className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <p className="mt-2 text-xs font-semibold text-foreground">{t('nav.monitoring')}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t('onboarding.preview.monitor')}
          </p>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/[0.05] px-3 py-3">
          <HardDrive className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
          <p className="text-xs leading-relaxed text-foreground">{t('onboarding.preview.storageHint')}</p>
        </div>
      </div>
    </WindowChrome>
  )
}

function LicensePreview(): React.ReactElement {
  const { t } = useTranslation()
  return (
    <div className="flex w-full max-w-[420px] flex-col items-center animate-in fade-in-0 zoom-in-95 duration-300">
      <div className="relative flex h-[280px] w-full items-center justify-center">
        <div className="absolute inset-8 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border border-border bg-card shadow-card">
          <img src={appIcon} alt="" className="h-20 w-20" />
        </div>
        <div className="absolute bottom-6 right-[18%] flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">{t('onboarding.preview.license')}</p>
    </div>
  )
}

export function ProductStage({ variant, imageSrc, imageAlt }: ProductStageProps): React.ReactElement {
  const { t } = useTranslation()
  const alt = imageAlt ?? t('onboarding.preview.alt')

  if (imageSrc) {
    return (
      <div className="relative w-full max-w-[520px] animate-in fade-in-0 slide-in-from-left-2 duration-300">
        <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-[0_18px_40px_-18px_rgb(15_23_42_/_0.35)]">
          <img src={imageSrc} alt={alt} className="block h-auto w-full object-cover object-top" />
        </div>
      </div>
    )
  }

  if (variant === 'value') return <ValuePreview />
  if (variant === 'features') return <FeaturesPreview />
  if (variant === 'license' || variant === 'account' || variant === 'ready') {
    return <LicensePreview />
  }
  return <WelcomePreview />
}

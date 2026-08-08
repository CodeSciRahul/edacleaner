import { useEffect } from 'react'
import { Crown, Lock, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  FEATURE_LABELS,
  PLAN_DISPLAY_NAMES,
  requiredPlanFor,
  type FeatureId
} from '@shared/entitlements'
import { useEntitlementsStore } from '@/store/entitlements-store'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'

const FEATURE_TITLE_KEYS: Record<FeatureId, TranslationKey> = {
  smart_scan: 'entitlements.feature.smart_scan',
  cleanup_basic: 'entitlements.feature.cleanup_basic',
  cleanup_temp: 'entitlements.feature.cleanup_temp',
  storage_overview: 'entitlements.feature.storage_overview',
  large_files: 'entitlements.feature.large_files',
  duplicates: 'entitlements.feature.duplicates',
  performance_boost: 'entitlements.feature.performance_boost',
  startup_apps: 'entitlements.feature.startup_apps',
  background_apps: 'entitlements.feature.background_apps',
  cleanup_reports: 'entitlements.feature.cleanup_reports',
  live_monitor: 'entitlements.feature.live_monitor'
}

const FEATURE_DESC_KEYS: Record<FeatureId, TranslationKey> = {
  smart_scan: 'entitlements.feature.smart_scanDesc',
  cleanup_basic: 'entitlements.feature.cleanup_basicDesc',
  cleanup_temp: 'entitlements.feature.cleanup_tempDesc',
  storage_overview: 'entitlements.feature.storage_overviewDesc',
  large_files: 'entitlements.feature.large_filesDesc',
  duplicates: 'entitlements.feature.duplicatesDesc',
  performance_boost: 'entitlements.feature.performance_boostDesc',
  startup_apps: 'entitlements.feature.startup_appsDesc',
  background_apps: 'entitlements.feature.background_appsDesc',
  cleanup_reports: 'entitlements.feature.cleanup_reportsDesc',
  live_monitor: 'entitlements.feature.live_monitorDesc'
}

const FEATURE_BENEFIT_KEYS: Record<FeatureId, TranslationKey[]> = {
  smart_scan: [],
  cleanup_basic: [],
  cleanup_temp: [
    'entitlements.benefit.temp1',
    'entitlements.benefit.temp2',
    'entitlements.benefit.proSuite'
  ],
  storage_overview: [
    'entitlements.benefit.storage1',
    'entitlements.benefit.storage2',
    'entitlements.benefit.proSuite'
  ],
  large_files: [
    'entitlements.benefit.large1',
    'entitlements.benefit.large2',
    'entitlements.benefit.proSuite'
  ],
  duplicates: [
    'entitlements.benefit.dup1',
    'entitlements.benefit.dup2',
    'entitlements.benefit.proSuite'
  ],
  performance_boost: [
    'entitlements.benefit.boost1',
    'entitlements.benefit.boost2',
    'entitlements.benefit.premiumSuite'
  ],
  startup_apps: [
    'entitlements.benefit.startup1',
    'entitlements.benefit.startup2',
    'entitlements.benefit.premiumSuite'
  ],
  background_apps: [
    'entitlements.benefit.bg1',
    'entitlements.benefit.bg2',
    'entitlements.benefit.premiumSuite'
  ],
  cleanup_reports: [
    'entitlements.benefit.reports1',
    'entitlements.benefit.reports2',
    'entitlements.benefit.premiumSuite'
  ],
  live_monitor: [
    'entitlements.benefit.monitor1',
    'entitlements.benefit.monitor2',
    'entitlements.benefit.premiumSuite'
  ]
}

export function UpgradePromptModal(): React.ReactElement | null {
  const { t } = useTranslation()
  const feature = useEntitlementsStore((s) => s.upgradePromptFeature)
  const closeUpgradePrompt = useEntitlementsStore((s) => s.closeUpgradePrompt)
  const continueToPlans = useEntitlementsStore((s) => s.continueToPlans)

  useEffect(() => {
    if (!feature) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeUpgradePrompt()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feature, closeUpgradePrompt])

  if (!feature) return null

  const requiredPlan = requiredPlanFor(feature)
  const title = t(FEATURE_TITLE_KEYS[feature]) || FEATURE_LABELS[feature]
  const description = t(FEATURE_DESC_KEYS[feature])
  const planLabel = PLAN_DISPLAY_NAMES[requiredPlan]

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
        aria-label={t('common.close')}
        onClick={closeUpgradePrompt}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-prompt-title"
        className="relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/12 to-transparent" />

        <div className="relative flex items-start justify-between gap-3 border-b border-border/80 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {t('entitlements.prompt.eyebrow', { plan: planLabel })}
              </p>
              <h2
                id="upgrade-prompt-title"
                className="mt-0.5 text-base font-semibold tracking-tight text-foreground"
              >
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeUpgradePrompt}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="relative space-y-4 px-5 py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>

          <div className="rounded-xl border border-border/80 bg-muted/40 px-3.5 py-3">
            <p className="text-[12px] font-semibold text-foreground">
              {t('entitlements.prompt.includes', { plan: planLabel })}
            </p>
            <ul className="mt-2 space-y-1.5">
              {FEATURE_BENEFIT_KEYS[feature].map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2 text-[12px] leading-snug text-muted-foreground"
                >
                  <Sparkles
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="order-3 h-9 sm:order-1"
            onClick={closeUpgradePrompt}
          >
            {t('entitlements.prompt.later')}
          </Button>
          <div className="order-1 flex flex-col gap-2 sm:order-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              onClick={continueToPlans}
            >
              {t('entitlements.prompt.compare')}
            </Button>
            <Button type="button" size="sm" className="h-9 gap-1.5" onClick={continueToPlans}>
              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
              {t('entitlements.prompt.upgrade')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

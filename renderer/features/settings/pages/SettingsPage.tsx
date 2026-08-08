import { useMemo, useState } from 'react'
import {
  Bell,
  Languages,
  Palette,
  PanelLeftClose,
  RotateCcw,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Toolbar } from '@/components/desktop/Toolbar'
import { Separator } from '@/components/ui/Separator'
import { useUiStore } from '@/store/ui-store'
import { useSettingsStore } from '@/store/settings-store'
import { SettingsNav } from '@/features/settings/components/SettingsNav'
import { SettingsSection } from '@/features/settings/components/SettingsSection'
import { SettingsToggleRow } from '@/features/settings/components/SettingsRow'
import { ThemePicker } from '@/features/settings/components/ThemePicker'
import { LanguagePicker } from '@/features/settings/components/LanguagePicker'
import { AboutPanel } from '@/features/settings/components/AboutPanel'
import { AccountPanel } from '@/features/settings/components/AccountPanel'
import { PlanPanel } from '@/features/settings/components/PlanPanel'
import {
  settingsCategories,
  type SettingsCategoryId
} from '@/features/settings/lib/settings-meta'
import { useTranslation } from '@/i18n/useTranslation'

export function SettingsPage(): React.ReactElement {
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('appearance')

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)

  const confirmBeforeClean = useSettingsStore((s) => s.confirmBeforeClean)
  const autoSelectSafeCategories = useSettingsStore((s) => s.autoSelectSafeCategories)
  const restoreLastSmartScan = useSettingsStore((s) => s.restoreLastSmartScan)
  const reduceMotion = useSettingsStore((s) => s.reduceMotion)
  const showCompletionFeedback = useSettingsStore((s) => s.showCompletionFeedback)
  const setSetting = useSettingsStore((s) => s.setSetting)
  const resetSettings = useSettingsStore((s) => s.resetSettings)

  const activeMeta = useMemo(
    () => settingsCategories.find((c) => c.id === activeCategory) ?? settingsCategories[0],
    [activeCategory]
  )

  return (
    <>
      <Toolbar
        title={t('settings.title')}
        description={t('settings.description')}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-9 gap-2 rounded-lg px-3 text-[13px]"
            onClick={() => resetSettings()}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('settings.reset')}
          </Button>
        }
      />

      <div className="p-content-pad">
        <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/[0.06] p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-xl space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                {t('settings.preferences')}
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {t(activeMeta.labelKey)}
              </h2>
              <p className="text-sm text-muted-foreground">{t(activeMeta.descriptionKey)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <SettingsNav
              categories={settingsCategories}
              activeId={activeCategory}
              onSelect={setActiveCategory}
            />
          </aside>

          <div className="min-w-0 space-y-6">
            {activeCategory === 'appearance' ? (
              <>
                <SettingsSection
                  icon={Palette}
                  title={t('settings.theme.title')}
                  description={t('settings.theme.description')}
                >
                  <ThemePicker />
                </SettingsSection>

                <SettingsSection
                  icon={Languages}
                  title={t('settings.language.title')}
                  description={t('settings.language.description')}
                >
                  <LanguagePicker />
                </SettingsSection>

                <SettingsSection
                  icon={SlidersHorizontal}
                  title={t('settings.motion.title')}
                  description={t('settings.motion.description')}
                >
                  <SettingsToggleRow
                    title={t('settings.motion.reduce')}
                    description={t('settings.motion.reduceDesc')}
                    checked={reduceMotion}
                    onCheckedChange={(checked) => {
                      setSetting('reduceMotion', checked)
                      document.documentElement.classList.toggle('reduce-motion', checked)
                    }}
                  />
                </SettingsSection>
              </>
            ) : null}

            {activeCategory === 'general' ? (
              <SettingsSection
                icon={PanelLeftClose}
                title={t('settings.layout.title')}
                description={t('settings.layout.description')}
              >
                <SettingsToggleRow
                  title={t('settings.layout.compact')}
                  description={t('settings.layout.compactDesc')}
                  checked={sidebarCollapsed}
                  onCheckedChange={setSidebarCollapsed}
                />
              </SettingsSection>
            ) : null}

            {activeCategory === 'optimization' ? (
              <SettingsSection
                icon={Sparkles}
                title={t('settings.optimization.title')}
                description={t('settings.optimization.description')}
              >
                <div className="space-y-1">
                  <SettingsToggleRow
                    title={t('settings.optimization.confirm')}
                    description={t('settings.optimization.confirmDesc')}
                    checked={confirmBeforeClean}
                    onCheckedChange={(checked) => setSetting('confirmBeforeClean', checked)}
                  />
                  <Separator />
                  <SettingsToggleRow
                    title={t('settings.optimization.autoSelect')}
                    description={t('settings.optimization.autoSelectDesc')}
                    checked={autoSelectSafeCategories}
                    onCheckedChange={(checked) =>
                      setSetting('autoSelectSafeCategories', checked)
                    }
                  />
                  <Separator />
                  <SettingsToggleRow
                    title={t('settings.optimization.restoreScan')}
                    description={t('settings.optimization.restoreScanDesc')}
                    checked={restoreLastSmartScan}
                    onCheckedChange={(checked) => setSetting('restoreLastSmartScan', checked)}
                  />
                </div>
              </SettingsSection>
            ) : null}

            {activeCategory === 'notifications' ? (
              <SettingsSection
                icon={Bell}
                title={t('settings.notifications.title')}
                description={t('settings.notifications.description')}
              >
                <SettingsToggleRow
                  title={t('settings.notifications.completion')}
                  description={t('settings.notifications.completionDesc')}
                  checked={showCompletionFeedback}
                  onCheckedChange={(checked) => setSetting('showCompletionFeedback', checked)}
                />
              </SettingsSection>
            ) : null}

            {activeCategory === 'plan' ? <PlanPanel /> : null}

            {activeCategory === 'account' ? <AccountPanel /> : null}

            {activeCategory === 'about' ? <AboutPanel /> : null}
          </div>
        </div>
      </div>
    </>
  )
}

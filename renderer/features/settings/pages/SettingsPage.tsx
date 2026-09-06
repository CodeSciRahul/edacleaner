import { useMemo, useState } from 'react'
import {
  Bell,
  Languages,
  Palette,
  PanelLeftClose,
  Settings2,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'
import { Separator } from '@/components/ui/Separator'
import { StatusCard } from '@/components/desktop/StatusCard'
import { useUiStore } from '@/store/ui-store'
import { useSettingsStore } from '@/store/settings-store'
import { useThemeStore } from '@/store/theme-store'
import { SettingsNav } from '@/features/settings/components/SettingsNav'
import { SettingsHero } from '@/features/settings/components/SettingsHero'
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
import { APP_LANGUAGES } from '@/i18n/types'
import { useTranslation } from '@/i18n/useTranslation'
import type { TranslationKey } from '@/i18n/locales/en'
import { electronService } from '@/services/electron-service'

const themeLabelKey: Record<'light' | 'dark' | 'system', TranslationKey> = {
  light: 'settings.theme.light',
  dark: 'settings.theme.dark',
  system: 'settings.theme.system'
}

export function SettingsPage(): React.ReactElement {
  const { t, language } = useTranslation()
  const [activeCategory, setActiveCategory] = useState<SettingsCategoryId>('appearance')

  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed)
  const theme = useThemeStore((s) => s.preference)

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

  const languageLabel = useMemo(() => {
    const match = APP_LANGUAGES.find((option) => option.id === language)
    return match?.nativeLabel ?? language
  }, [language])

  async function handleReset(): Promise<void> {
    const confirm = await electronService.dialog().message({
      type: 'question',
      title: t('settings.resetConfirmTitle'),
      message: t('settings.resetConfirmMessage'),
      buttons: [t('settings.resetCancel'), t('settings.resetConfirm')]
    })
    if (confirm.response === 1) {
      resetSettings()
      document.documentElement.classList.toggle(
        'reduce-motion',
        useSettingsStore.getState().reduceMotion
      )
    }
  }

  return (
    <div className="space-y-6 p-content-pad">
      <SettingsHero
        categoryLabel={t(activeMeta.labelKey)}
        categoryDescription={t(activeMeta.descriptionKey)}
        themeLabel={t(themeLabelKey[theme])}
        languageLabel={languageLabel}
        onReset={() => void handleReset()}
      />

      <StatusCard
        icon={Settings2}
        title={t(activeMeta.labelKey)}
        status="good"
        message={t('settings.hero.statusHint', { section: t(activeMeta.labelKey) })}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-card backdrop-blur-sm">
            <p className="px-3 pb-2 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.hero.browse')}
            </p>
            <SettingsNav
              categories={settingsCategories}
              activeId={activeCategory}
              onSelect={setActiveCategory}
            />
          </div>
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
                  onCheckedChange={(checked) => setSetting('autoSelectSafeCategories', checked)}
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
  )
}

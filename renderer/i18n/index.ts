import type { AppLanguage } from '@/i18n/types'
import { en, type TranslationKey } from '@/i18n/locales/en'
import { fr } from '@/i18n/locales/fr'
import { de } from '@/i18n/locales/de'

const catalogs: Record<AppLanguage, Record<TranslationKey, string>> = {
  en,
  fr,
  de
}

export type TranslationVars = Record<string, string | number>

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  vars?: TranslationVars
): string {
  const template = catalogs[language][key] ?? catalogs.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = vars[name]
    return value === undefined ? `{{${name}}}` : String(value)
  })
}

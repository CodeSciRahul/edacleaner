export type AppLanguage = 'en' | 'fr' | 'de'

export const APP_LANGUAGES: Array<{
  id: AppLanguage
  label: string
  nativeLabel: string
  descriptionKey: 'language.enDesc' | 'language.frDesc' | 'language.deDesc'
}> = [
  {
    id: 'en',
    label: 'English',
    nativeLabel: 'English',
    descriptionKey: 'language.enDesc'
  },
  {
    id: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    descriptionKey: 'language.frDesc'
  },
  {
    id: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    descriptionKey: 'language.deDesc'
  }
]

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'fr' || value === 'de'
}

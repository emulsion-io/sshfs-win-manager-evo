export const defaultLocale = 'fr'

export const supportedLocaleOptions = [
  { value: 'fr', labelKey: 'settings.languageFr' },
  { value: 'en', labelKey: 'settings.languageEn' }
]

export const supportedLocales = supportedLocaleOptions.map(locale => locale.value)

export function normalizeLocale (locale) {
  return supportedLocales.includes(locale) ? locale : defaultLocale
}

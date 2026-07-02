import { createI18n } from 'vue-i18n'

import fr from './fr.js'
import en from './en.js'
import { defaultLocale, normalizeLocale, supportedLocales } from './locales.js'

export { defaultLocale, normalizeLocale, supportedLocales }

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: defaultLocale,
  fallbackLocale: defaultLocale,
  messages: {
    fr,
    en
  }
})

export function setLocale (locale) {
  i18n.global.locale.value = normalizeLocale(locale)
}

export default i18n

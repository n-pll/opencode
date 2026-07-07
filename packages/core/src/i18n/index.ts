import { dict as en } from "./en"
import { dict as zh } from "./zh"
import {
  SUPPORTED_LOCALES,
  envLocale,
  normalizeLocale,
  resolveLocale,
  resolveTemplate,
  translate,
  type Dictionary,
  type I18nParams,
} from "./engine"

export { resolveTemplate, resolveLocale, normalizeLocale, envLocale, translate, SUPPORTED_LOCALES }
export type { Dictionary, I18nParams }

export type CoreI18nKey = keyof typeof en

const dictionaries: Record<string, Dictionary> = { en, zh: zh as Dictionary }

/**
 * Headless translator bound to the core dictionary namespace.
 * CLI/TUI code reads locale once at boot (via resolveLocale) and reuses this.
 */
export function coreTranslator(locale: string) {
  const local = dictionaries[locale] ?? {}
  return (key: CoreI18nKey, params?: I18nParams) => translate(en, local, key, params)
}

/** Convenience: translate using the locale resolved at call time from env/config. */
export function tCore(options?: { envLocale?: string; configLocale?: string }) {
  return coreTranslator(resolveLocale(options))
}

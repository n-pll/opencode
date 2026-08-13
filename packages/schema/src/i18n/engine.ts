/**
 * Minimal headless i18n engine, owned by the schema package so every layer
 * (schema → core/protocol → server) can depend on it without violating the
 * dependency direction (schema must not import core). Pure functions, zero
 * dependencies, mirroring the upstream ui package's resolveTemplate/fallback
 * lookup behavior (missing params render the empty string).
 */

export type I18nParams = Record<string, string | number | boolean | undefined | null | unknown>

export type Dictionary = Record<string, string>

/**
 * Replace `{{param}}` placeholders in `text` with values from `params`.
 * Missing params resolve to the empty string, matching the ui i18n behavior.
 */
export function resolveTemplate(text: string, params?: I18nParams) {
  if (!params) return text
  return text.replace(/{{\s*([^}]+?)\s*}}/g, (_, rawKey) => {
    const value = params[String(rawKey)]
    return value === undefined ? "" : String(value)
  })
}

/**
 * Translate `key` using the merged dictionary (locale overrides English, and
 * English is authoritative for key existence), falling back to the key itself
 * when missing, then interpolating `params`.
 */
export function translate(en: Dictionary, locale: Dictionary, key: string, params?: I18nParams) {
  const merged: Dictionary = { ...en, ...locale }
  const value = merged[key] ?? key
  return resolveTemplate(value, params)
}

/**
 * Resolve the active locale from the environment: OPENCODE_LOCALE wins, then
 * LANG/LC_* (the generic POSIX defaults), then "en". Layer-specific engines
 * (core's resolveLocale) may layer config-file lookup on top of this.
 */
export function resolveLocale(options?: { envLocale?: string; fallback?: string }) {
  const fallback = options?.fallback ?? "en"
  const explicit = options?.envLocale !== undefined ? options.envLocale : process.env["OPENCODE_LOCALE"]
  if (explicit) return explicit
  const lang = process.env["LC_ALL"] ?? process.env["LC_MESSAGES"] ?? process.env["LANG"]
  return lang || fallback
}

/** Build a translator bound to a dictionary pair and a locale. */
export function coreTranslator(en: Dictionary, locale: Dictionary, localeCode: string) {
  return (key: string, params?: I18nParams) => translate(en, locale, key, params)
}

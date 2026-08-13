import { resolveLocale, translate, type Dictionary, type I18nParams } from "@opencode-ai/core/i18n"
import { dict as tuiEn } from "./en"
import { dict as tuiZh } from "./zh"

/**
 * Module-level translator for non-reactive consumers (schema annotations,
 * config defaults evaluated at module load). Kept in its own module so schema
 * files can use it without pulling in the Solid context/KV chain from
 * context/language. Components needing live language switching use
 * useLanguage().t instead.
 */
const locale = resolveLocale()
const active: Dictionary = locale === "zh" || locale === "zht" ? ({ ...tuiEn, ...tuiZh } as Dictionary) : tuiEn

export const t = (key: string, params?: I18nParams) => translate(tuiEn, active, key, params)
export const tuiModuleLocale = locale

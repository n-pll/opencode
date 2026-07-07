import { resolveLocale, translate, type Dictionary, type I18nParams } from "@opencode-ai/core/i18n"
import { dict as en } from "./en"
import { dict as zh } from "./zh"

export type CliI18nKey = keyof typeof en

const dictionaries: Record<string, Dictionary> = { en, zh }

/**
 * Headless translator bound to the cli.* dictionary namespace. Resolves the
 * locale once at module load from OPENCODE_LOCALE/LANG/config, matching the
 * one-shot lifecycle of a CLI process.
 */
const locale = resolveLocale()
const active = dictionaries[locale] ?? {}
export const t = (key: CliI18nKey, params?: I18nParams) => translate(en, active, key, params)
export const cliLocale = locale

export * from "./en"
export * from "./zh"

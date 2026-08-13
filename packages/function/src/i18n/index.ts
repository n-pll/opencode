import { dict as en } from "./en"
import { dict as zh } from "./zh"
import { coreTranslator, resolveLocale, translate, type Dictionary, type I18nParams } from "@opencode-ai/schema/i18n/engine"

export { resolveLocale, translate, coreTranslator }
export type { Dictionary, I18nParams }

export type FunctionI18nKey = keyof typeof en

const dictionaries: Record<string, Dictionary> = { en, zh: zh as Dictionary }

const locale = resolveLocale()
const active = dictionaries[locale] ?? {}

export const t = (key: FunctionI18nKey, params?: I18nParams) => translate(en, active, key, params)
export const functionLocale = locale

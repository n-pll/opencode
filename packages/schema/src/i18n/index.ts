import { dict as en } from "./en"
import { dict as zh } from "./zh"
import { coreTranslator, resolveLocale, translate, type Dictionary, type I18nParams } from "./engine"

export { resolveLocale, translate, coreTranslator }
export type { Dictionary, I18nParams }

export type SchemaI18nKey = keyof typeof en

const dictionaries: Record<string, Dictionary> = { en, zh: zh as Dictionary }

/**
 * Headless translator bound to the schema.* dictionary namespace. Resolves the
 * locale once at module load from OPENCODE_LOCALE/LANG. Schema definitions are
 * module-load-time static metadata, so their descriptions honor the process
 * locale (config-file locale lookup lives in core's richer resolveLocale).
 */
const locale = resolveLocale()
const active = dictionaries[locale] ?? {}

export const t = (key: SchemaI18nKey, params?: I18nParams) => translate(en, active, key, params)
export const schemaLocale = locale

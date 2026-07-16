import { peekConfigLocale, resolveLocale, translate, type Dictionary, type I18nParams } from "@opencode-ai/core/i18n"
import { dict as en } from "./en"
import { dict as zh } from "./zh"

export type CliI18nKey = keyof typeof en

const dictionaries: Record<string, Dictionary> = { en, zh: zh as Dictionary }

/**
 * Resolve --locale/-L from argv inline, before resolveLocale reads the env.
 * bun compile does not preserve ESM import order, so we cannot rely on a
 * separate boot module; this scan runs in the same module that consumes it.
 */
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === "--locale" || arg === "-L") {
    const value = process.argv[i + 1]
    if (value && !value.startsWith("-")) process.env.OPENCODE_LOCALE = value
    break
  }
  if (arg.startsWith("--locale=")) {
    process.env.OPENCODE_LOCALE = arg.slice("--locale=".length)
    break
  }
}

/**
 * Headless translator bound to the cli.* dictionary namespace. Resolves the
 * locale once at module load from OPENCODE_LOCALE/LANG/opencode.json, matching
 * the one-shot lifecycle of a CLI process.
 */
const locale = resolveLocale({ configLocale: peekConfigLocale() })
const active = dictionaries[locale] ?? {}
export const t = (key: CliI18nKey, params?: I18nParams) => translate(en, active, key, params)
export const cliLocale = locale

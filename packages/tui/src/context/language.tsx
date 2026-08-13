import { createMemo, createSignal, useContext } from "solid-js"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"
import { peekConfigLocale, resolveLocale, resolveTemplate, translate, type Dictionary, type I18nParams } from "@opencode-ai/core/i18n"
import { dict as tuiEn } from "../i18n/en"
import { dict as tuiZh } from "../i18n/zh"
import { dict as uiEn } from "@opencode-ai/ui/i18n/en"
import { dict as uiZh } from "@opencode-ai/ui/i18n/zh"

export type TuiLocale = "en" | "zh"

const LOCALES: readonly TuiLocale[] = ["en", "zh"]

const en: Dictionary = { ...tuiEn, ...uiEn }
const dictionaries: Record<TuiLocale, Dictionary> = {
  en,
  zh: { ...tuiZh, ...uiZh },
}

const LABELS: Record<TuiLocale, string> = {
  en: "English",
  zh: "中文",
}

const KV_KEY = "language"

function detectLocale(configLocale?: string): TuiLocale {
  const resolved = resolveLocale({ configLocale })
  return resolved === "zh" || resolved === "zht" ? "zh" : "en"
}

function normalize(value: string | undefined, configLocale?: string): TuiLocale {
  return LOCALES.includes(value as TuiLocale) ? (value as TuiLocale) : detectLocale(configLocale)
}

export const { context: LanguageContext, provider: LanguageProvider } = createSimpleContext({
  name: "Language",
  init: () => {
    const kv = useKV()
    const stored = kv.get(KV_KEY) as string | undefined
    // Priority: explicit KV choice > opencode.json locale field > env detection.
    const initial = normalize(stored, peekConfigLocale())

    const [locale, setLocaleSignal] = createSignal<TuiLocale>(initial)

    const dict = createMemo(() => dictionaries[locale()])
    const t = (key: string, params?: I18nParams) => translate(en, dict(), key, params)

    return {
      ready: true,
      locale,
      locales: LOCALES,
      label: (value: TuiLocale) => LABELS[value],
      t,
      resolveTemplate,
      setLocale(next: TuiLocale) {
        const normalized = LOCALES.includes(next) ? next : "en"
        setLocaleSignal(normalized)
        kv.set(KV_KEY, normalized)
      },
    }
  },
})

// Static fallback used when no LanguageProvider is mounted (tests, plugin
// entrypoints rendering outside the app shell): a boot-time snapshot instead
// of the throw from the raw context. Live switching still requires the provider.
const fallbackDict = dictionaries[normalize(undefined, peekConfigLocale())]
const fallbackLocale = normalize(undefined, peekConfigLocale())

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (value) return value
  return {
    ready: true,
    locale: () => fallbackLocale,
    locales: LOCALES,
    label: (v: TuiLocale) => LABELS[v],
    t: (key: string, params?: I18nParams) => translate(en, fallbackDict, key, params),
    resolveTemplate,
    setLocale() {},
  }
}

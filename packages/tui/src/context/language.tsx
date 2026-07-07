import { createMemo, createSignal } from "solid-js"
import { createSimpleContext } from "./helper"
import { useKV } from "./kv"
import { resolveLocale, resolveTemplate, translate, type Dictionary, type I18nParams } from "@opencode-ai/core/i18n"
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

function detectLocale(): TuiLocale {
  const resolved = resolveLocale()
  return resolved === "zh" || resolved === "zht" ? "zh" : "en"
}

function normalize(value: string | undefined): TuiLocale {
  return LOCALES.includes(value as TuiLocale) ? (value as TuiLocale) : detectLocale()
}

export const { use: useLanguage, provider: LanguageProvider } = createSimpleContext({
  name: "Language",
  init: () => {
    const kv = useKV()
    const stored = kv.get<string>(KV_KEY)
    const initial = normalize(stored)

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

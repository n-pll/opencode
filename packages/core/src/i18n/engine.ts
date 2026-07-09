import path from "node:path"
import { readFileSync } from "node:fs"
import { Global } from "../global"

export type I18nParams = Record<string, string | number | boolean>

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
 * Translate `key` using `dict`, falling back to the key itself when missing,
 * then interpolating `params`. The English dictionary is conventionally
 * authoritative for key existence.
 */
export function translate(en: Dictionary, locale: Dictionary, key: string, params?: I18nParams) {
  const value = locale[key] ?? en[key] ?? key
  return resolveTemplate(value, params)
}

/**
 * Resolve the active locale string ("en", "zh", ...) using the precedence:
 * OPENCODE_LOCALE env → LC_ALL / LC_MESSAGES / LANG env → fallback.
 * Callers pass the config-derived `locale` (if any) as `configLocale`;
 * when set it wins over everything except the explicit env override, which
 * exists to force a language for boot-time logs/errors.
 */
export function resolveLocale(options?: { envLocale?: string; configLocale?: string; fallback?: string }) {
  const fallback = options?.fallback ?? "en"
  const env = options?.envLocale ?? envLocale()
  if (env) return normalizeLocale(env)
  const config = options?.configLocale
  if (config) return normalizeLocale(config)
  return fallback
}

const KNOWN: readonly string[] = ["en", "zh", "zht", "ko", "de", "es", "fr", "da", "ja", "pl", "ru", "uk", "ar", "no", "br", "th", "bs", "tr"]

/** Map a raw locale string (e.g. "zh_CN.UTF-8", "zh-Hans") to a known code. */
export function normalizeLocale(value: string): string {
  const lower = value.toLowerCase()
  const direct = lower.split(/[._-]/)[0]
  if (direct === "zh") {
    if (lower.includes("hant") || lower.includes("tw") || lower.includes("hk") || lower.includes("mo")) return "zht"
    return "zh"
  }
  if (lower.startsWith("nb") || lower.startsWith("nn") || lower.startsWith("no")) return "no"
  if (direct === "pt") return "br"
  if (KNOWN.includes(direct)) return direct
  return "en"
}

/**
 * Process-level env access isolated for testability. Reads happen at call time
 * (not module load) so tests and the CLI can set these at runtime.
 */
export function envLocale() {
  return process.env["OPENCODE_LOCALE"] ?? process.env["LC_ALL"] ?? process.env["LC_MESSAGES"] ?? process.env["LANG"]
}

/** Locales the headless engine ships dictionaries for. */
export const SUPPORTED_LOCALES: readonly string[] = ["en", "zh"]

/**
 * Synchronously peek the `locale` field from opencode.json/config.json without
 * loading the full Effect config layer. Used at boot time (before the config
 * Service resolves) so early `describe`/`t()` strings honor the configured
 * locale. Returns undefined when no candidate file has a locale field.
 */
export function peekConfigLocale(): string | undefined {
  const candidates = [
    process.env["OPENCODE_CONFIG"],
    path.join(process.cwd(), "opencode.jsonc"),
    path.join(process.cwd(), "opencode.json"),
    path.join(process.cwd(), "config.json"),
    path.join(Global.Path.config, "opencode.jsonc"),
    path.join(Global.Path.config, "opencode.json"),
    path.join(Global.Path.config, "config.json"),
  ]
  for (const file of candidates) {
    if (!file) continue
    try {
      const text = readFileSync(file, "utf8")
      const match = text.match(/"locale"\s*:\s*"([^"]+)"/)
      if (match) return match[1]
    } catch {
      // file missing or unreadable — try next candidate
    }
  }
  return undefined
}

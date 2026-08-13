import path from "node:path"
import { readFileSync } from "node:fs"
import { xdgConfig } from "xdg-basedir"
import {
  resolveTemplate,
  translate,
  type Dictionary,
  type I18nParams,
} from "@opencode-ai/schema/i18n/engine"

export { resolveTemplate, translate }
export type { Dictionary, I18nParams }

/**
 * Resolve the active locale string ("en", "zh", ...) using the precedence:
 * OPENCODE_LOCALE env → LC_ALL / LC_MESSAGES / LANG env → fallback.
 * Callers pass the config-derived `locale` (if any) as `configLocale`;
 * when set it wins over everything except the explicit env override, which
 * exists to force a language for boot-time logs/errors.
 */
export function resolveLocale(options?: { envLocale?: string; configLocale?: string; fallback?: string }) {
  const fallback = options?.fallback ?? "en"
  // OPENCODE_LOCALE is an explicit override and wins over everything.
  const explicit = options?.envLocale !== undefined ? options.envLocale : process.env["OPENCODE_LOCALE"]
  if (explicit) return normalizeLocale(explicit)
  // The opencode.json locale field is an explicit user choice, so it wins over
  // the generic LANG/LC_* environment (which is often a system default like
  // "C.UTF-8" that carries no real language intent).
  const config = options?.configLocale
  if (config) return normalizeLocale(config)
  // Fall back to LANG/LC_* only when neither override nor config set a locale.
  const lang = options?.envLocale !== undefined ? undefined : langEnv()
  if (lang) return normalizeLocale(lang)
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
 * The explicit OPENCODE_LOCALE override, if set. Read at call time (not module
 * load) so tests and the CLI can set it at runtime.
 */
export function envLocale() {
  return process.env["OPENCODE_LOCALE"]
}

/**
 * The generic POSIX locale environment (LC_ALL/LC_MESSAGES/LANG). These are
 * system defaults and rank below an explicit opencode.json locale field.
 */
function langEnv() {
  return process.env["LC_ALL"] ?? process.env["LC_MESSAGES"] ?? process.env["LANG"]
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
  // Config dir mirrors Global.Path.config (xdg config + opencode). Using
  // xdgConfig directly keeps this module free of the ../global import chain,
  // which low-level modules (util/flock) also import — a static Global import
  // here would form a module-load cycle.
  const configDir = xdgConfig ? path.join(xdgConfig, "opencode") : undefined
  const candidates = [
    process.env["OPENCODE_CONFIG"],
    path.join(process.cwd(), "opencode.jsonc"),
    path.join(process.cwd(), "opencode.json"),
    path.join(process.cwd(), "config.json"),
    path.join(process.cwd(), "ocl.json"),
    configDir && path.join(configDir, "opencode.jsonc"),
    configDir && path.join(configDir, "opencode.json"),
    configDir && path.join(configDir, "config.json"),
    configDir && path.join(configDir, "ocl.json"),
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

#!/usr/bin/env bun

// Closed-loop i18n codemod: detect and rewrite all residual visible texts into
// t("key") calls, inject the right translator binding per context, and append
// keys to the domain dictionaries. Reuses i18n-residual-scan's detector.
//
// Usage:
//   bun run i18n:codemod            # dry-run report (default)
//   bun run i18n:codemod -- --apply # write changes + update dictionaries
//
// Idempotent: strings already wrapped in t(...) are skipped; a key whose
// English value already exists in the dictionary is reused (translation
// memory), so repeated runs converge. This is the post-sync replay step:
// after merging upstream, run --apply, then translate:fork fills zh, then
// i18n:residual-scan must exit 0.

import path from "path"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { collectFindings, type Finding } from "./i18n-residual-scan"

const root = path.resolve(import.meta.dir, "..")

// Domain → i18n dir + key prefix + import style.
const DOMAIN_INFO: Record<string, { i18n: string; prefix: string; importPath: (file: string) => string }> = {
  schema: { i18n: "packages/schema/src/i18n", prefix: "schema.", importPath: relImport },
  protocol: { i18n: "packages/protocol/src/i18n", prefix: "protocol.", importPath: relImport },
  codemode: { i18n: "packages/codemode/src/i18n", prefix: "codemode.", importPath: relImport },
  llm: { i18n: "packages/llm/src/i18n", prefix: "llm.", importPath: relImport },
  server: { i18n: "packages/server/src/i18n", prefix: "server.", importPath: relImport },
  enterprise: { i18n: "packages/enterprise/src/i18n", prefix: "enterprise.", importPath: relImport },
  function: { i18n: "packages/function/src/i18n", prefix: "function.", importPath: relImport },
  core: { i18n: "packages/core/src/i18n", prefix: "core.", importPath: relImport },
  opencode: { i18n: "packages/opencode/src/i18n", prefix: "cli.", importPath: () => 'import { t } from "@/i18n"' },
  // tui uses useLanguage() inside components and the lightweight module t elsewhere.
  tui: { i18n: "packages/tui/src/i18n", prefix: "tui.", importPath: () => "" },
}

/** Relative import for module-level t (i18n/index.ts) from a source file. */
function relImport(file: string): string {
  const domain = file.split("/")[1]
  const dir = DOMAIN_INFO[domain].i18n // e.g. packages/core/src/i18n
  const from = file.replace(/\\/g, "/").replace(/^packages\/[^/]+\/src\//, "")
  const depth = from.split("/").length - 1
  const target = "../".repeat(depth) + "i18n"
  return `import { t } from "${target === "i18n" ? "./i18n" : target}"`
}

const slug = (text: string) =>
  text.replace(/\$\{[^}]*\}/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)

/** Extract {name: expr} params from a template literal. Returns null when any expr is too complex. */
function extractParams(template: string): Record<string, string> | null {
  // Nested templates (backtick inside ${...}) truncate the capture; treat the
  // unmatched-brace result as needing manual hoisting.
  const opens = (template.match(/\$\{/g) || []).length
  const closes = (template.match(/\}/g) || []).length
  if (opens !== closes) return null
  const params: Record<string, string> = {}
  let pIndex = 0
  for (const expr of template.matchAll(/\$\{([^}]*)\}/g)) {
    const raw = expr[1]?.trim() ?? ""
    let name: string
    if (/^[A-Za-z_$][\w$]*$/.test(raw)) name = raw
    else if (/^[A-Za-z_$][\w$]*(\.[\w$]+)+$/.test(raw)) name = raw.split(".").at(-1)!
    else if (/^[A-Za-z_$][\w$]*\[[^\]]*\]$/.test(raw)) name = raw.split("[")[0]
    else if (/^[A-Za-z_$][\w$.]*\([^)]*\)$/.test(raw)) name = `p${pIndex++}`
    else if (/^[^`"']*\?[^`"']*:[^`"']*$/.test(raw)) name = `p${pIndex++}`
    else return null // nested template / quoted ternary — needs manual hoisting
    if (params[name]) name = `${name}${pIndex++}`
    params[name] = raw
  }
  return params
}

/** Build the dictionary value for a template: ${expr} → {{paramName}} (matching extractParams). */
function templateValue(template: string, params: Record<string, string> | null): string | undefined {
  if (params === null) return undefined
  let i = 0
  return template.replace(/\$\{([^}]*)\}/g, () => {
    const name = Object.keys(params)[i++]
    return `{{${name}}}`
  })
}

function domainOf(file: string): string {
  return file.split("/")[1]
}

// Load a domain dictionary key → en text (translation memory).
function loadEn(domain: string): Map<string, string> {
  const info = DOMAIN_INFO[domain]
  const file = path.join(root, info.i18n, "en.ts")
  const map = new Map<string, string>()
  if (!existsSync(file)) return map
  const text = readFileSync(file, "utf8")
  for (const m of text.matchAll(/"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g)) {
    map.set(m[1], m[2].replace(/\\"/g, '"'))
  }
  return map
}

// Locate the enclosing component function and its body brace line (TUI).
function enclosingFunction(lines: string[], lineIdx: number) {
  for (let i = lineIdx; i >= 0; i--) {
    if (/^(?:export\s+)?(?:async\s+)?function\s+\w+\s*<[^>]*>\s*\(/.test(lines[i])) return { declLine: i }
    if (/^(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/.test(lines[i])) return { declLine: i }
    if (/^(?:export\s+)?const\s+\w+[^=]*=\s*(?:async\s*)?\(/.test(lines[i])) return { declLine: i }
    if (/^(?:export\s+)?(?:const|let|class|interface|type)\s/.test(lines[i])) return undefined
  }
  return undefined
}

/** True when the finding's enclosing scope binds a local `t` (shadows imports). */
function hasLocalT(lines: string[], findingLine: number): boolean {
  // Scan a 30-line window above the finding for any local t binding; function
  // boundaries are not needed — an earlier binding in the same scope shadows.
  for (let i = findingLine; i >= Math.max(0, findingLine - 30); i--) {
    if (/\b(?:const|let|var)\s+t\s*=/.test(lines[i])) return true
    if (/^\s*(?:export\s+)?(?:function|const|let|class|interface|type)\s/.test(lines[i]) && i < findingLine) break
  }
  return false
}

function bodyBraceLine(lines: string[], declLine: number) {
  for (let i = declLine; i < lines.length && i < declLine + 30; i++) {
    if (/\)\s*\{?\s*$/.test(lines[i]) && lines[i].includes(")")) {
      if (lines[i].includes("{")) return i
      if (/\)\s*$/.test(lines[i]) && lines[i + 1]?.trim() === "{") return i + 1
    }
  }
  return undefined
}

async function main() {
  const apply = Bun.argv.includes("--apply")
  const findings = collectFindings()

  const byFile = new Map<string, Finding[]>()
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, [])
    byFile.get(f.file)!.push(f)
  }

  const newKeys: Array<{ domain: string; key: string; en: string }> = []
  const manual: string[] = []
  let replaced = 0

  for (const [file, entries] of byFile) {
    const domain = domainOf(file)
    const info = DOMAIN_INFO[domain]
    if (!info) continue
    let text = readFileSync(path.join(root, file), "utf8")
    const lines = text.split("\n")
    const enMemory = loadEn(domain)
    const fileSlug = path.basename(file).replace(/\.(ts|tsx)$/, "").replace(/[^A-Za-z0-9]/g, "_")

    // Dedupe by literal within this file.
    const unique = [...new Map(entries.map((e) => [e.literal, e])).values()]

    // TUI: collect component-scope injection points (dedupe by function decl).
    // Walk ALL entries: the same literal can appear in several functions, and
    // each enclosing function needs its own binding even though the rewrite
    // (split/join below) hits every occurrence at once.
    const tuiInjections = new Map<number, true>() // declLine → inject
    let tuiModuleT = false
    if (domain === "tui") {
      for (const e of entries) {
        const fn = enclosingFunction(lines, e.line - 1)
        if (fn) {
          tuiInjections.set(fn.declLine, true)
        } else {
          tuiModuleT = true
        }
      }
    }

    // TUI: inject useLanguage BEFORE rewriting (rewrites shift line numbers).
    if (domain === "tui" && tuiInjections.size > 0) {
      // Precompute brace lines against the ORIGINAL lines: bodyBraceLine walks
      // line numbers, so re-reading a mutated array would drift. Dedupe by
      // brace line — two findings can map to different decls with the same
      // body (multi-line param lists), which must not inject twice.
      const braces = new Map<number, number>() // brace → declLine
      for (const declLine of tuiInjections.keys()) {
        const brace = bodyBraceLine(lines, declLine)
        if (brace === undefined) tuiModuleT = true
        else if (!braces.has(brace)) braces.set(brace, declLine)
      }
      let offset = 0
      for (const brace of braces.keys()) {
        // Skip functions that already bind t (earlier manual codemods).
        if (lines[brace + 1]?.includes("const { t } = useLanguage()")) continue
        const indent = lines[brace].match(/^(\s*)/)?.[1] ?? ""
        lines.splice(brace + offset + 1, 0, `${indent}  const { t } = useLanguage()`)
        offset++
      }
      text = lines.join("\n")
    }

    for (const e of unique) {
      // A local `t` binding shadows the injected import; hoist manually.
      if (hasLocalT(lines, e.line - 1)) {
        manual.push(`${file}:${e.line}: ${e.value.slice(0, 60)} (local t shadows import)`)
        continue
      }
      const base = `${info.prefix}${fileSlug}.${slug(e.value)}`
      let key = base
      let n = 2
      while (text.includes(`"${key}"`) || newKeys.some((k) => k.key === key)) key = `${base}.${n++}`

      // Translation memory: reuse an existing key with the same English value.
      const params = e.quote === "`" ? extractParams(e.value) : {}
      const enValue = e.quote === "`" ? templateValue(e.value, params) : e.value
      if (enValue === undefined) {
        manual.push(`${file}:${e.line}: ${e.value.slice(0, 60)}`)
        continue
      }
      let memoryKey: string | undefined
      for (const [k, v] of enMemory) {
        if (v === enValue) {
          memoryKey = k
          break
        }
      }
      if (memoryKey) key = memoryKey

      // Build the replacement call.
      const call =
        params && Object.keys(params).length > 0
          ? `t("${key}", { ${Object.entries(params).map(([name, expr]) => `${name}: ${expr}`).join(", ")} })`
          : `t("${key}")`

      // Replace in the right shape.
      if (e.jsxAttr) {
        text = text.split(`${e.jsxAttr}="${e.value}"`).join(`${e.jsxAttr}={${call}}`)
      } else if (e.quote === "`") {
        text = text.split(`\`${e.value}\``).join(call)
      } else {
        text = text.split(`"${e.value}"`).join(call)
      }
      replaced++
      if (!memoryKey) {
        newKeys.push({ domain, key, en: enValue })
        enMemory.set(key, enValue)
      }
    }

    // Inject translator imports/bindings.
    const orig = readFileSync(path.join(root, file), "utf8")
    if (domain === "tui") {
      const hasUseLangImport = /import\s*\{[^}]*useLanguage[^}]*\}\s*from\s*"[^"]*language"/.test(orig)
      const hasTImport = /import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*"[^"]*i18n\/t"/.test(orig)
      if (tuiInjections.size > 0 && !hasUseLangImport) {
        const rel = file.replace(/^packages\/tui\/src\//, "")
        const depth = rel.split("/").length - 1
        const imp = depth === 0 ? 'import { useLanguage } from "./context/language"' : `import { useLanguage } from "${"../".repeat(depth)}context/language"`
        text = imp + "\n" + text
      }
      if (tuiModuleT && !hasTImport) {
        const rel = file.replace(/^packages\/tui\/src\//, "")
        const depth = rel.split("/").length - 1
        const imp = depth === 0 ? 'import { t } from "./i18n/t"' : `import { t } from "${"../".repeat(depth)}i18n/t"`
        text = imp + "\n" + text
      }
    } else {
      const imp = info.importPath(file)
      const importRe = /import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*"@\/i18n"|import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*"([^"]*\/)?i18n"/
      if (imp && !importRe.test(orig)) text = imp + "\n" + text
    }

    if (apply) writeFileSync(path.join(root, file), text)
  }

  // Append new keys to dictionaries.
  if (apply) {
    for (const domain of [...new Set(newKeys.map((k) => k.domain))]) {
      const info = DOMAIN_INFO[domain]
      const enFile = path.join(root, info.i18n, "en.ts")
      let en = readFileSync(enFile, "utf8")
      const missing = newKeys.filter((k) => k.domain === domain && !en.includes(`"${k.key}"`))
      if (missing.length) {
        en = en.replace(/\}\s*$/, missing.map((k) => `  "${k.key}": ${JSON.stringify(k.en)},`).join("\n") + "\n}\n")
        writeFileSync(enFile, en)
      }
      const zhFile = path.join(root, info.i18n, "zh.ts")
      let zh = readFileSync(zhFile, "utf8")
      const zhMissing = missing.filter((k) => !zh.includes(`"${k.key}"`))
      if (zhMissing.length) {
        zh = zh.replace(/\}\s*$/, zhMissing.map((k) => `  "${k.key}": "",`).join("\n") + "\n}\n")
        writeFileSync(zhFile, zh)
      }
    }
  }

  console.log(
    apply
      ? `\nApplied: ${replaced} rewrites, ${newKeys.length} new keys. Run translate:fork to fill zh, then i18n:residual-scan must exit 0.`
      : `\nDry run: ${replaced} would be rewritten (${newKeys.length} new keys). Pass --apply to write.`,
  )
  if (manual.length) {
    console.log(`需手工 (复杂表达式): ${manual.length}`)
    for (const m of manual) console.log(`  ${m}`)
  }
}

await main()

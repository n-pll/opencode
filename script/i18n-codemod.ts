#!/usr/bin/env bun

// Detect hardcoded user-visible strings in the fork's CLI/TUI/core sources and
// rewrite them into `t("key")` calls, then append the new keys to the en
// dictionary (zh entries are filled by translate-fork.ts via LLM).
//
// This is the fork's replacement for manual merge recall: after syncing
// upstream, run this script to re-apply t() wrapping to anything the upstream
// merge overwrote or added, then run translate:fork to translate the new keys.
//
// Scope:
//   - Auto-rewrites CLI sources (packages/opencode/src): `t` is a module-level
//     import there, so replacement is unconditional and safe.
//   - TUI/core sources (packages/tui/src, packages/core/src) are reported as a
//     candidate list instead: their `t` comes from a Solid context
//     (useLanguage()) or a per-file translator binding, so automatic rewrites
//     need manual/LLM placement.
//
// Usage:
//   bun run i18n:codemod               # dry-run report (default)
//   bun run i18n:codemod -- --apply    # write changes + update dictionaries
//
// Idempotent: strings already wrapped in t("...") are skipped; strings whose
// English value already exists in the en dictionary reuse that key (translation
// memory), so repeated runs converge.

import path from "path"

const root = path.resolve(import.meta.dir, "..")

const CLI_DIR = path.join(root, "packages/opencode/src")
const REPORT_DIRS = [path.join(root, "packages/tui/src"), path.join(root, "packages/core/src")]

// Call-site patterns whose string literal argument is user-visible.
const CALL_PATTERNS = [
  /(describe\s*:\s*)(["'])((?:\\.|[^"'])*)\2/g,
  /((?:println|print)\s*\(\s*)(["'])((?:\\.|[^"'])*)\2/g,
  /((?:Prompt\.(?:intro|outro|log\.(?:info|warn|error|debug))|s\.start|s\.stop)\s*\(\s*)(["'])((?:\\.|[^"'])*)\2/g,
]

const SKIP_DIRS = ["i18n", "test", "tests", "node_modules"]
const SKIP_FILES = /\.(test|spec)\.(ts|tsx)$/

/** Candidates that are clearly not translatable prose. */
function isSkippable(value: string): { skip: boolean; reason?: string } {
  if (value.length < 2) return { skip: true, reason: "too short" }
  if (!/[A-Za-z]/.test(value)) return { skip: true, reason: "no letters" }
  if (/^\s*[{}\[\]()<>|&+=*#@$%^`~;:,./\\-]+\s*$/.test(value)) return { skip: true, reason: "punctuation only" }
  if (/^(https?:|ftp:|\/|\.\/|\.\.\/)/.test(value)) return { skip: true, reason: "URL or path" }
  if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(value)) return { skip: true, reason: "email" }
  if (/^%[\w.]+$/.test(value)) return { skip: true, reason: "format token" }
  if (/^[a-z_][\w-]*$/.test(value) && !/ /.test(value)) return { skip: true, reason: "identifier-ish" }
  return { skip: false }
}

/** Derive a stable semantic key slug from a string, e.g. "No active account" → "no-active-account". */
function slugify(value: string): string {
  const words = value
    .replace(/\{\{[^}]+\}\}/g, "") // strip {{tokens}} for the slug
    .replace(/[^A-Za-z0-9\s-]/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
  if (words.length === 0) return "message"
  return words.join("-")
}

type DictionaryFile = { path: string; entries: Map<string, string> }

async function loadDictionary(domain: "core" | "cli" | "tui"): Promise<DictionaryFile> {
  const file = path.join(root, "packages", domain === "cli" ? "opencode" : domain, "src/i18n/en.ts")
  const text = await Bun.file(file).text()
  const entries = new Map<string, string>()
  for (const match of text.matchAll(/"([^"]+)":\s*"((?:\\.|[^"\\])*)"/g)) {
    entries.set(match[1], match[2].replace(/\\"/g, '"'))
  }
  return { path: file, entries }
}

function importLine(file: string): string | undefined {
  const rel = path.relative(path.dirname(file), path.join(root, "packages/opencode/src"))
  const prefix = rel === "" ? "." : rel.split(path.sep).join("/").replace(/^\.\.\//g, "../")
  const target = `${prefix}/i18n`
  return `import { t } from "${target}"`
}

function hasImport(file: string): boolean {
  const text = Bun.file(file).text()
  // Matches any import of the i18n module: "@/i18n", "../../i18n", etc.
  return /import\s*\{[^}]*\bt\b[^}]*\}\s*from\s*"[^"]*\/i18n"/.test(text)
}

/** Find candidate matches in one file. */
async function scanFile(file: string, dict: DictionaryFile): Promise<Array<{ start: number; end: number; value: string; key?: string }>> {
  const text = await Bun.file(file).text()
  const matches: Array<{ start: number; end: number; value: string; key?: string }> = []
  for (const pattern of CALL_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const prefix = match[1]
      const literal = match[3]
      const start = match.index! + prefix.length
      const end = start + match[2].length * 2 + literal.length
      // Skip if already wrapped (defensive; the call-site patterns above do
      // not match `t("...")` because `t(` sits between the API and the quote).
      if (text.slice(start - 1, start) === "t") continue
      const { skip, reason } = isSkippable(literal)
      if (skip) continue
      // Translation memory: reuse existing key when the English value matches.
      let key: string | undefined
      for (const [k, v] of dict.entries) {
        if (v === literal) {
          key = k
          break
        }
      }
      matches.push({ start, end, value: literal, key })
    }
  }
  return matches
}

/** Deterministic file slug for key generation: relative path with separators → dots. */
function fileKeyPrefix(relPath: string): string {
  const parts = relPath.replace(/\\/g, "/").replace(/^packages\/(opencode|tui|core)\/src\//, "").split("/")
  const name = parts.at(-1)!.replace(/\.tsx?$/, "").replace(/[^A-Za-z0-9]/g, "-")
  return name
}

async function collectFiles(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of new Bun.Glob("**/*.{ts,tsx}").scanSync({ cwd: dir, onlyFiles: true })) {
    if (SKIP_FILES.test(entry)) continue
    if (entry.split(/[\\/]/).some((part) => SKIP_DIRS.includes(part))) continue
    out.push(path.join(dir, entry))
  }
  return out
}

async function main() {
  const apply = Bun.argv.includes("--apply")
  const dict = await loadDictionary("cli")
  const cliFiles = await collectFiles(CLI_DIR)
  const reportFiles = (await Promise.all(REPORT_DIRS.map(collectFiles))).flat()

  let newKeys = 0
  let reusedKeys = 0
  let rewritten = 0
  const report: string[] = []

  for (const file of cliFiles) {
    const matches = await scanFile(file, dict)
    if (matches.length === 0) continue
    const rel = path.relative(root, file).replace(/\\/g, "/")
    const prefix = fileKeyPrefix(rel)
    const text = await Bun.file(file).text()
    let out = text
    for (const match of matches) {
      let key = match.key
      if (!key) {
        // New key: cli.<fileSlug>.<valueSlug> with collision suffix.
        const base = `cli.${prefix}.${slugify(match.value)}`
        key = base
        let n = 2
        while (dict.entries.has(key)) key = `${base}.${n++}`
        dict.entries.set(key, match.value)
        newKeys++
      } else {
        reusedKeys++
      }
      out = out.slice(0, match.start) + `t("${key}")` + out.slice(match.end)
      rewritten++
    }
    if (apply) {
      if (!hasImport(file)) {
        const line = importLine(file)
        if (line) out = `${line}\n${out}`
      }
      await Bun.write(file, out)
    }
    report.push(`${apply ? "apply" : "would-rewrite"}: ${rel} (${matches.length} string(s))`)
  }

  // TUI/core: candidate list only (t requires Solid context / local binding).
  for (const file of reportFiles) {
    const matches = await scanFile(file, dict)
    if (matches.length === 0) continue
    const rel = path.relative(root, file).replace(/\\/g, "/")
    report.push(`manual: ${rel} (${matches.length} candidate(s) — needs useLanguage()/translator placement)`)
  }

  for (const line of report) console.log(line)
  console.log(
    apply
      ? `\nApplied: ${rewritten} rewrites (${newKeys} new keys, ${reusedKeys} reused). Run translate:fork to fill zh.`
      : `\nDry run: ${rewritten} would be rewritten (${newKeys} new keys, ${reusedKeys} reused). Pass --apply to write.`,
  )
  if (apply && newKeys > 0) {
    // Append new keys to the en dictionary: insert before the closing brace,
    // keyed by the tracked entries that were not already persisted.
    const existing = await Bun.file(dict.path).text()
    const additions = [...dict.entries.entries()].filter(([k]) => !existing.includes(`"${k}":`))
    if (additions.length > 0) {
      const block = additions.map(([k, v]) => `  "${k}": ${JSON.stringify(v)},`).join("\n")
      await Bun.write(dict.path, existing.replace(/\}\s*$/, `${block}\n}\n`))
    }
  }
}

await main()

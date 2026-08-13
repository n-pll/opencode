#!/usr/bin/env bun

// Scan the fork's i18n-covered domains for residual user/LLM-visible strings
// that were not wrapped in t().
//
// This is the companion to translate-fork.ts: drift checking answers "are the
// dictionaries in sync", while this scan answers "did the codemod / upstream
// merge leave any visible literal behind". Run both after syncing upstream:
//
//   bun run translate:fork -- zh --check   # dictionary drift
//   bun run i18n:residual-scan            # unwrapped visible literals
//
// Heuristics (mirrors what the manual review found):
//   - Looks at `summary|description|message|title|label|error` fields and
//     direct throw/c.json error strings with a capital-letter literal.
//   - Skips dictionary files, tests, stories, HTTP headers, URLs, schema
//     identifiers (`Xxx.Yyy`), template literals, and `console.*` logs.
//   - Exits 1 when anything is found, so CI / the release pipeline can gate.
//
// Options:
//   --json   emit findings as JSON lines

import path from "path"
import { existsSync } from "node:fs"

const root = path.resolve(import.meta.dir, "..")

// Domains that have an i18n dictionary and therefore must not leave visible
// literals behind. Extend this list as new domains are covered.
const DOMAINS = ["schema", "protocol", "codemode", "llm", "server", "enterprise", "function", "core", "opencode", "tui"]

// Match visible-text fields AND direct error constructors. The `error` branch
// must not match `errorMessage(...)` calls: require `error:` (field) or
// `new Error(` / bare `Error(` constructors, never `errorXxx(`. The value
// capture excludes quotes/commas so `"Kind", t(...)` does not bleed in.
const FIELD_RE =
  /(?:summary|description|message|title|label)\s*[:(\s]*[`"]([A-Z][a-zA-Z0-9 .'()/\-]{12,150})[`"]|error\s*:\s*[`"]([A-Z][a-zA-Z0-9 .'()/\-]{12,150})[`"]|(?:new\s+)?Error\([`"]([A-Z][a-zA-Z0-9 .'()/\-]{12,150})[`"]/g

const SKIP_VALUE = [
  /^(http|https|www|data|aria|class|style)/i,
  /^(Content-Type|Cache-Control|Upgrade|Accept|Authorization|application\/|text\/)/i,
  /^[A-Z][A-Za-z0-9]*\.[A-Z]/, // schema / error identifiers (Session.NotFoundError)
  /\$\{/, // template literals
  /^[A-Z][A-Za-z0-9]*Error$/, // bare error class names
  /^[A-Z][A-Za-z0-9]*$/, // PascalCase identifiers (kind tags, class names)
]

const SKIP_FILE = /\.(test|spec)\.(ts|tsx)$|\.d\.ts$|(^|\/)i18n\/|stories/

function isSkippable(value: string): boolean {
  return SKIP_VALUE.some((re) => re.test(value))
}

function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of new Bun.Glob("**/*.{ts,tsx}").scanSync({ cwd: dir, onlyFiles: true })) {
    if (SKIP_FILE.test(entry)) continue
    files.push(path.join(dir, entry))
  }
  return files
}

async function main() {
  const asJson = Bun.argv.includes("--json")
  const findings: Array<{ file: string; line: number; text: string }> = []

  for (const domain of DOMAINS) {
    const dir = path.join(root, "packages", domain === "opencode" ? "opencode" : domain, "src")
    if (!existsSync(dir)) continue
    for (const file of collectFiles(dir)) {
      const text = await Bun.file(file).text()
      // Strip comments before scanning so doc examples do not trip the scan.
      const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
      for (const match of code.matchAll(FIELD_RE)) {
        const value = match[1] ?? match[2] ?? match[3] ?? ""
        if (isSkippable(value)) continue
        // Skip already-translated call sites: the literal is a kind tag or a
        // t() argument, i.e. `"Kind", t("key")` / `t("key")` / `message: t(...)`.
        const after = code.slice(match.index! + match[0].length, match.index! + match[0].length + 40)
        if (/,\s*t\(/.test(after)) continue
        if (/^Error\("/.test(match[0]) && /^\s*,/.test(after)) continue
        // Skip console.* diagnostic logs: they are server-side noise, not API
        // responses shown to users or the model.
        const lineStart = code.lastIndexOf("\n", match.index!) + 1
        const lineText = code.slice(lineStart, code.indexOf("\n", match.index!))
        if (/console\.(log|error|warn|debug)\(/.test(lineText)) continue
        const line = code.slice(0, match.index!).split("\n").length
        findings.push({ file: path.relative(root, file).replace(/\\/g, "/"), line, text: value })
      }
    }
  }

  if (asJson) {
    for (const f of findings) console.log(JSON.stringify(f))
  } else {
    for (const f of findings) console.log(`${f.file}:${f.line}: ${f.text}`)
    console.log(`\n残留可见文本: ${findings.length}`)
  }
  process.exit(findings.length > 0 ? 1 : 0)
}

await main()

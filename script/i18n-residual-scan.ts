#!/usr/bin/env bun

// Detect residual user/LLM-visible strings in the fork's i18n-covered domains
// that are not wrapped in t(). Also exported as a library for i18n-codemod.
//
//   bun run i18n:residual-scan            # report; exit 1 when anything found
//   bun run i18n:residual-scan --json     # JSON lines
//
// Detection covers literal fields (`description: "..."`), error constructors
// (`Error("...")`), JSX attributes (`attr="text"`), and template literals
// (`` `text ${x}` ``). Template literals keep their ${expr} for codemod param
// extraction; the scanner itself reports them as residuals too.

import path from "path"
import { existsSync, readFileSync } from "node:fs"

const root = path.resolve(import.meta.dir, "..")

// Domains that have an i18n dictionary and therefore must not leave visible
// literals behind. Extend this list as new domains are covered.
export const DOMAINS = ["schema", "protocol", "codemode", "llm", "server", "enterprise", "function", "core", "opencode", "tui"]

export type Finding = {
  file: string
  line: number
  /** Captured value; template literals keep ${expr} verbatim. */
  value: string
  /** Full literal including quotes/backticks, for exact replacement. */
  literal: string
  /** Quote kind: double-quoted literal or backtick template. */
  quote: '"' | "`"
  /** JSX attribute name when matched as attr="text". */
  jsxAttr?: string
  /** True when matched via an Error(...) constructor. */
  isError: boolean
  /** ${expr} list for template literals; empty for plain literals. */
  params: string[]
}

// Literal fields + error constructors (double-quoted). Prefixes use [ \t] only
// (never \s) so a field name can not bridge a line break; the lookbehind
// excludes path segments (`/message`) and identifiers (`xmessage`) so route
// templates never match their trailing segment as a field name.
const FIELD_PREFIX = String.raw`(?<![\/\w$])(?:summary|description|message|title|label)[ \t]*[:=([ \t]*`
const LITERAL_RE = new RegExp(
  FIELD_PREFIX + String.raw`"([A-Z][a-zA-Z0-9 .'()/\-]{12,150})"|(?<![\/\w$])error[ \t]*:[ \t]*"([A-Z][a-zA-Z0-9 .'()/\-]{12,150})"|(?:new[ \t]+)?Error\("([A-Z][a-zA-Z0-9 .'()/\-]{12,150})"`,
  "g",
)

// Same shapes with template literals; ${...} may appear inside. Escaped
// backticks (\`) are part of the template. Matched first so nested
// field-lookalikes inside templates (label: "${x}") are excluded afterwards.
// The prefix also accepts `=` (description = `...` assignments).
const TEMPLATE_RE = new RegExp(
  FIELD_PREFIX + "`((?:[^`\\\\]|\\\\.)*)`|(?<![\\/\\w$])error[ \\t]*:[ \\t]*`((?:[^`\\\\]|\\\\.)*)`|(?:new[ \\t]+)?Error\\(`((?:[^`\\\\]|\\\\.)*)`",
  "g",
)

// JSX attribute: attr="Text" (capital-letter text).
const JSX_RE = /(\w+)="([A-Z][a-zA-Z0-9 .'()/\-]{12,150})"/g

const SKIP_VALUE = [
  /^(http|https|www|data|aria|class|style)/i,
  /^(Content-Type|Cache-Control|Upgrade|Accept|Authorization|application\/|text\/)/i,
  /^[A-Z][A-Za-z0-9]*\.[A-Z]/, // schema / error identifiers (Session.NotFoundError)
  /^[A-Z][A-Za-z0-9]*Error$/, // bare error class names
  /^[A-Z][A-Za-z0-9]*$/, // PascalCase identifiers (kind tags, class names)
  /^\//, // path templates (`${root}/...`) — route paths are not prose
  /^[a-z][\w$]*\s*\//, // interpolated route segments starting lowercase (`${root}/:id`)
]

const SKIP_FILE = /\.(test|spec)\.(ts|tsx)$|\.d\.ts$|(^|\/)i18n\/|stories/

function isSkippable(value: string): boolean {
  const stripped = value.replace(/\$\{[^}]*\}/g, "")
  return SKIP_VALUE.some((re) => re.test(stripped))
}

/** Skip console.* diagnostic logs (server-side noise, not API responses). */
function isConsoleLine(code: string, index: number): boolean {
  const lineStart = code.lastIndexOf("\n", index) + 1
  const lineText = code.slice(lineStart, code.indexOf("\n", index))
  return /console\.(log|error|warn|debug)\(/.test(lineText)
}

function paramsOf(template: string): string[] {
  return Array.from(template.matchAll(/\$\{([^}]*)\}/g), (m) => m[1]?.trim() ?? "").filter(Boolean)
}

function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of new Bun.Glob("**/*.{ts,tsx}").scanSync({ cwd: dir, onlyFiles: true })) {
    if (SKIP_FILE.test(entry)) continue
    files.push(path.join(dir, entry))
  }
  return files
}

/** Scan all covered domains and return residual findings. */
export function collectFindings(): Finding[] {
  const findings: Finding[] = []
  for (const domain of DOMAINS) {
    const dir = path.join(root, "packages", domain === "opencode" ? "opencode" : domain, "src")
    if (!existsSync(dir)) continue
    for (const file of collectFiles(dir)) {
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
      const seen = new Set<number>()

      const push = (m: RegExpExecArray, groupIdx: number, quote: '"' | "`") => {
        if (!m[groupIdx]) return
        const value = m[groupIdx]
        if (isSkippable(value)) return
        if (isConsoleLine(code, m.index)) return
        if (seen.has(m.index)) return
        seen.add(m.index)
        const literal = quote === '"' ? `"${value}"` : `\`${value}\``
        findings.push({
          file: path.relative(root, file).replace(/\\/g, "/"),
          line: code.slice(0, m.index).split("\n").length,
          value,
          literal,
          quote,
          isError: m[0].includes("Error("),
          params: quote === "`" ? paramsOf(value) : [],
        })
      }

      // Templates first: their spans shadow nested field-lookalikes such as
      // `label: "${x}"` inside a larger template.
      const templateSpans: Array<[number, number]> = []
      for (const m of code.matchAll(TEMPLATE_RE)) {
        templateSpans.push([m.index!, m.index! + m[0].length])
      }
      const inTemplate = (index: number) => templateSpans.some(([s, e]) => index >= s && index < e)

      // JSX attributes: mark attr="text" so codemod emits braces.
      for (const m of code.matchAll(JSX_RE)) {
        if (!m[2] || isSkippable(m[2])) continue
        if (isConsoleLine(code, m.index!)) continue
        if (inTemplate(m.index!)) continue
        if (seen.has(m.index!)) continue
        seen.add(m.index!)
        findings.push({
          file: path.relative(root, file).replace(/\\/g, "/"),
          line: code.slice(0, m.index).split("\n").length,
          value: m[2],
          literal: `${m[1]}="${m[2]}"`,
          quote: '"',
          jsxAttr: m[1],
          isError: false,
          params: [],
        })
      }

      for (const m of code.matchAll(TEMPLATE_RE)) push(m, m[1] ? 1 : m[2] ? 2 : 3, "`")
      for (const m of code.matchAll(LITERAL_RE)) {
        if (inTemplate(m.index!)) continue
        push(m, m[1] ? 1 : m[2] ? 2 : 3, '"')
      }
    }
  }
  return findings
}

async function main() {
  const asJson = Bun.argv.includes("--json")
  const findings = collectFindings()
  if (asJson) {
    for (const f of findings) console.log(JSON.stringify(f))
  } else {
    for (const f of findings) console.log(`${f.file}:${f.line}: ${f.value}`)
    console.log(`\n残留可见文本: ${findings.length}`)
  }
  process.exit(findings.length > 0 ? 1 : 0)
}

if (import.meta.main) await main()

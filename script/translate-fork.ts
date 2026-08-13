#!/usr/bin/env bun

// Fork translation sync for the CLI/TUI/core dictionaries.
//
// Reuses the upstream translate-app.ts machinery (findDrift, LLM translation,
// permission-scoped editing, model verification) but scopes it to the fork's
// own dictionary domains instead of app/ui/desktop. The upstream script is
// left untouched so it stays byte-identical with upstream/dev.
//
// Usage:
//   bun run translate:fork -- zh          # translate missing keys for zh
//   bun run translate:fork -- zh --check  # exit nonzero when drift exists (CI)
//   bun run translate:fork -- zh --dry-run
//
// Options mirror the upstream script: --concurrency, --model, --variant.

import path from "path"
import { parseArgs } from "util"
import { pathToFileURL } from "url"
import {
  findDrift,
  glossaryFile,
  modelVariants,
  runPool,
  sessionIDFromEvents,
  sessionModels,
  textFromEvents,
  translationConfig,
  unexpectedChanges,
  type Dictionary,
} from "./translate-app"

type Drift = ReturnType<typeof findDrift>
type Domain = { name: string; source: string; target: string; drift: Drift }

/** Fork dictionary domains. en is the source of truth for each domain. */
const DOMAINS: ReadonlyArray<{ name: string; path: string }> = [
  { name: "core", path: "packages/core/src/i18n" },
  { name: "cli", path: "packages/opencode/src/i18n" },
  { name: "tui", path: "packages/tui/src/i18n" },
  { name: "schema", path: "packages/schema/src/i18n" },
  { name: "protocol", path: "packages/protocol/src/i18n" },
  { name: "codemode", path: "packages/codemode/src/i18n" },
  { name: "llm", path: "packages/llm/src/i18n" },
  { name: "server", path: "packages/server/src/i18n" },
  { name: "enterprise", path: "packages/enterprise/src/i18n" },
  { name: "function", path: "packages/function/src/i18n" },
]

const locales = ["zh"] as const
type Locale = (typeof locales)[number]

const languages: Record<Locale, string> = {
  zh: "Simplified Chinese",
}

const root = path.resolve(import.meta.dir, "..")

export function parseForkTranslationArgs(args: string[]) {
  const parsed = parseArgs({
    args,
    options: {
      concurrency: { type: "string", short: "c", default: "4" },
      model: { type: "string", default: "opencode/gpt-5.5" },
      variant: { type: "string", default: "xhigh" },
      "dry-run": { type: "boolean", default: false },
      check: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  })
  const target = parsed.positionals[0] ?? "zh"
  const concurrency = Number(parsed.values.concurrency)
  if (!parsed.values.help && parsed.positionals.length !== 1) throw new Error("Pass one locale (zh).")
  if (target !== "zh") throw new Error(`Unknown locale '${target}'. Fork ships en + zh only.`)
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Concurrency must be a positive integer.")
  return {
    target: target as Locale,
    concurrency: target === "all" ? concurrency : 1,
    model: parsed.values.model,
    variant: parsed.values.variant,
    dryRun: parsed.values["dry-run"],
    check: parsed.values.check,
    help: parsed.values.help,
  }
}

export function targetFiles(locale: Locale) {
  return DOMAINS.map((domain) => `${domain.path}/${locale}.ts`)
}

function isDictionary(value: unknown): value is Dictionary {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  return Object.values(value).every((item) => typeof item === "string")
}

async function dictionary(file: string) {
  const module: unknown = await import(pathToFileURL(path.join(root, file)).href)
  if (typeof module !== "object" || module === null || !("dict" in module) || !isDictionary(module.dict)) {
    throw new Error(`Invalid translation dictionary: ${file}`)
  }
  return module.dict
}

async function inspect(locale: Locale) {
  const domains = await Promise.all(
    DOMAINS.map(async (domain) => {
      const source = `${domain.path}/en.ts`
      const target = `${domain.path}/${locale}.ts`
      const dictionaries = await Promise.all([dictionary(source), dictionary(target)])
      const drift = findDrift(dictionaries[0], dictionaries[1], locale)
      // findDrift treats an empty target value as "present"; the fork's codemod
      // generates empty zh stubs, so count those as missing too.
      const empty = Object.keys(dictionaries[1]).filter((key) => (dictionaries[1][key] ?? "").trim() === "")
      return {
        name: domain.name,
        source,
        target,
        drift: { ...drift, missing: [...drift.missing, ...empty] },
      }
    }),
  )
  return { locale, language: languages[locale], domains }
}

function report(plan: { locale: Locale; domains: Domain[] }) {
  const details = plan.domains
    .map(
      (domain) =>
        `${domain.name}: ${domain.drift.missing.length} missing, ${domain.drift.extra.length} extra, ${domain.drift.placeholders.length} placeholder mismatches`,
    )
    .join("; ")
  console.log(`[${plan.locale}] ${details}`)
}

function changed(drift: Drift) {
  return drift.missing.length > 0 || drift.extra.length > 0 || drift.placeholders.length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function resolveModelVariant(model: string, variant: string) {
  const provider = model.split("/")[0]
  if (!provider || !model.includes("/")) throw new Error(`Model must use provider/model syntax: ${model}`)
  const env = isolatedEnvironment()
  env.OPENCODE_DISABLE_PROJECT_CONFIG = "1"
  const proc = Bun.spawn(["opencode", "--pure", "models", provider, "--verbose"], {
    cwd: root,
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const result = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  if (result[2] !== 0) throw new Error(result[1] || `Unable to resolve model: ${model}`)
  const variants = modelVariants(result[0], model)
  // Models without configured variants (common for third-party providers)
  // run with the default variant; only enforce the requested variant when the
  // provider actually defines alternatives.
  if (Object.keys(variants).length === 0) return undefined
  if (!Object.hasOwn(variants, variant)) throw new Error(`Variant '${variant}' is not configured for ${model}.`)
  return variants[variant]
}

function isolatedEnvironment() {
  const env = { ...process.env }
  delete env.OPENCODE_CONFIG
  delete env.OPENCODE_CONFIG_DIR
  delete env.OPENCODE_CONFIG_CONTENT
  delete env.OPENCODE_PERMISSION
  delete env.OPENCODE_AUTO_SHARE
  return env
}

async function commandTemplate() {
  const upstream = path.join(root, "script/translate-app.md")
  const fork = path.join(root, "script/translate-fork.md")
  const file = (await Bun.file(fork).exists()) ? fork : upstream
  return (await Bun.file(file).text()).trim()
}

async function worktreeSnapshot() {
  const groups = await Promise.all([
    gitPaths(["diff", "--name-only", "-z", "HEAD"]),
    gitPaths(["ls-files", "--others", "--exclude-standard", "-z"]),
  ])
  const files = [...new Set(groups.flat())]
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => {
        const target = Bun.file(path.join(root, file))
        if (!(await target.exists())) return [file, "<missing>"] as const
        const hash = new Bun.CryptoHasher("sha256")
        hash.update(await target.arrayBuffer())
        return [file, hash.digest("hex")] as const
      }),
    ),
  )
}

async function gitPaths(args: string[]) {
  const proc = Bun.spawn(["git", ...args], {
    cwd: root,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const result = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  if (result[2] !== 0) throw new Error(result[1] || `git ${args.join(" ")} failed`)
  return result[0].split("\0").filter(Boolean)
}

async function check(locale: Locale) {
  const proc = Bun.spawn([process.execPath, import.meta.path, locale, "--check"], {
    cwd: root,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  })
  const result = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited])
  return { locale, stdout: result[0], stderr: result[1], code: result[2] }
}

async function translate(
  plan: { locale: Locale; language: string; domains: Domain[] },
  template: string,
  model: string,
  variant: string,
) {
  const glossary = glossaryFile(plan.locale)
  const glossaryContent = (await Bun.file(path.join(root, glossary)).exists())
    ? await Bun.file(path.join(root, glossary)).text()
    : undefined
  const prompt = template.replaceAll("$1", plan.locale).replaceAll(
    "$ARGUMENTS",
    JSON.stringify(
      {
        locale: plan.locale,
        language: plan.language,
        glossary: glossaryContent ? { file: glossary, content: glossaryContent } : undefined,
        domains: plan.domains.map((domain) => ({
          source: domain.source,
          target: domain.target,
          ...domain.drift,
        })),
      },
      null,
      2,
    ),
  )
  const agent = `translate-fork-${plan.locale}-${process.pid}`
  const env = isolatedEnvironment()
  env.OPENCODE_DISABLE_PROJECT_CONFIG = "1"
  env.OPENCODE_CONFIG_CONTENT = JSON.stringify(
    translationConfig(
      agent,
      model,
      plan.domains.map((domain) => domain.target),
    ),
  )

  const proc = Bun.spawn(
    [
      "opencode",
      "--pure",
      "run",
      "--dir",
      root,
      "--agent",
      agent,
      "--model",
      model,
      // Omit --variant entirely when the provider defines no variants.
      ...(variant ? ["--variant", variant] : []),
      "--title",
      `Translate fork ${plan.locale}`,
      "--format",
      "json",
    ],
    {
      cwd: root,
      env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    },
  )
  const stdout = new Response(proc.stdout).text()
  const stderr = new Response(proc.stderr).text()
  await proc.stdin.write(prompt)
  await proc.stdin.end()
  const result = await Promise.all([stdout, stderr, proc.exited])
  if (result[2] !== 0) return { locale: plan.locale, stdout: result[0], stderr: result[1], code: result[2] }

  const sessionID = sessionIDFromEvents(result[0])
  const exported = Bun.spawn(["opencode", "--pure", "export", sessionID, "--sanitize"], {
    cwd: root,
    env,
    stdout: "pipe",
    stderr: "pipe",
  })
  const exportResult = await Promise.all([
    new Response(exported.stdout).text(),
    new Response(exported.stderr).text(),
    exported.exited,
  ])
  if (exportResult[2] !== 0) {
    return { locale: plan.locale, stdout: textFromEvents(result[0]), stderr: exportResult[1], code: exportResult[2] }
  }

  const session: unknown = JSON.parse(exportResult[0])
  const observed = sessionModels(session)
  const mismatch =
    observed.length === 0 || observed.some((item) => item.model !== model || (variant !== undefined && item.variant !== variant))
  const actual = Array.from(new Set(observed.map((item) => `${item.model} (${item.variant ?? "default"})`))).join(", ")
  return {
    locale: plan.locale,
    stdout: `${textFromEvents(result[0])}\nVerified session model: ${actual}\n`,
    stderr: mismatch
      ? `Requested ${model} (${variant}), but session used ${actual || "no assistant model"}.\n`
      : result[1],
    code: mismatch ? 1 : 0,
  }
}

async function main() {
  const options = parseForkTranslationArgs(Bun.argv.slice(2))
  if (options.help) {
    console.log(`
Usage: bun run translate:fork -- <locale> [options]

Synchronizes the fork CLI/TUI/core dictionaries with their English sources.

Options:
  -c, --concurrency <count>  Maximum parallel OpenCode runs (default: 4)
      --model <provider/id>  OpenCode model (default: opencode/gpt-5.5)
      --variant <name>       Model variant (default: xhigh)
      --dry-run              Report drift without running OpenCode
      --check                Exit nonzero when translation drift exists
  -h, --help                 Show this help message

Examples:
  bun run translate:fork -- zh
  bun run translate:fork -- zh --check
`)
    return
  }

  const plans = await Promise.all(locales.map((locale) => inspect(locale)))
  plans.forEach(report)
  const pending = plans.filter((plan) => plan.domains.some((domain) => changed(domain.drift)))
  if (options.check) {
    if (pending.length) process.exitCode = 1
    return
  }
  if (options.dryRun || pending.length === 0) return

  const targets = pending.flatMap((plan) => plan.domains.map((domain) => domain.target))
  const baseline = await worktreeSnapshot()
  const variant = await resolveModelVariant(options.model, options.variant)
  console.log(`Resolved ${options.model} (${options.variant}): ${JSON.stringify(variant)}`)
  const template = await commandTemplate()
  const results = await runPool(pending, options.concurrency, (plan) =>
    translate(plan, template, options.model, options.variant).catch((error) => ({
      locale: plan.locale,
      code: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    })),
  )

  results.forEach((result) => {
    if (result.stdout) process.stdout.write(`\n[${result.locale}]\n${result.stdout}`)
    if (result.stderr) process.stderr.write(`\n[${result.locale}]\n${result.stderr}`)
  })

  const failed = results.filter((result) => result.code !== 0)
  const checks = await runPool(pending, options.concurrency, (plan) => check(plan.locale))
  const incomplete = checks.filter((result) => result.code !== 0)
  const escaped = unexpectedChanges(baseline, await worktreeSnapshot(), targets)
  incomplete.forEach((result) => {
    if (result.stdout) process.stderr.write(`\n[${result.locale} verification]\n${result.stdout}`)
    if (result.stderr) process.stderr.write(`\n[${result.locale} verification]\n${result.stderr}`)
  })

  if (failed.length === 0 && incomplete.length === 0 && escaped.length === 0) {
    console.log(`\nTranslated ${pending.map((plan) => plan.locale).join(", ")}.`)
    return
  }

  if (failed.length) console.error(`\nOpenCode failed for: ${failed.map((result) => result.locale).join(", ")}`)
  if (incomplete.length)
    console.error(`Translation remains incomplete for: ${incomplete.map((plan) => plan.locale).join(", ")}`)
  if (escaped.length) console.error(`Translation changed files outside its locale targets: ${escaped.join(", ")}`)
  process.exitCode = 1
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}

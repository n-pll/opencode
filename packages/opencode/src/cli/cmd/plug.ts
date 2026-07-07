import { intro, log, outro, spinner } from "@clack/prompts"
import { Effect } from "effect"

import { ConfigPaths } from "@/config/paths"
import { Global } from "@opencode-ai/core/global"
import { installPlugin, patchPluginConfig, readPluginManifest } from "../../plugin/install"
import { resolvePluginTarget } from "../../plugin/shared"
import { errorMessage } from "../../util/error"
import { Filesystem } from "@/util/filesystem"
import { Process } from "@/util/process"
import { UI } from "../ui"
import { effectCmd } from "../effect-cmd"
import { InstanceRef } from "@/effect/instance-ref"
import { t } from "@/i18n"

type Spin = {
  start: (msg: string) => void
  stop: (msg: string, code?: number) => void
}

export type PlugDeps = {
  spinner: () => Spin
  log: {
    error: (msg: string) => void
    info: (msg: string) => void
    success: (msg: string) => void
  }
  resolve: (spec: string) => Promise<string>
  readText: (file: string) => Promise<string>
  write: (file: string, text: string) => Promise<void>
  exists: (file: string) => Promise<boolean>
  files: (dir: string, name: "opencode" | "tui") => string[]
  global: string
}

export type PlugInput = {
  mod: string
  global?: boolean
  force?: boolean
}

export type PlugCtx = {
  vcs?: string
  worktree: string
  directory: string
}

const defaultPlugDeps: PlugDeps = {
  spinner: () => spinner(),
  log: {
    error: (msg) => log.error(msg),
    info: (msg) => log.info(msg),
    success: (msg) => log.success(msg),
  },
  resolve: (spec) => resolvePluginTarget(spec),
  readText: (file) => Filesystem.readText(file),
  write: async (file, text) => {
    await Filesystem.write(file, text)
  },
  exists: (file) => Filesystem.exists(file),
  files: (dir, name) => ConfigPaths.fileInDirectory(dir, name),
  global: Global.Path.config,
}

function cause(err: unknown) {
  if (!err || typeof err !== "object") return
  if (!("cause" in err)) return
  return (err as { cause?: unknown }).cause
}

export function createPlugTask(input: PlugInput, dep: PlugDeps = defaultPlugDeps) {
  const mod = input.mod
  const force = Boolean(input.force)
  const global = Boolean(input.global)

  return async (ctx: PlugCtx) => {
    const install = dep.spinner()
    install.start(t("cli.plugin.spinner.installing"))
    const target = await installPlugin(mod, dep)
    if (!target.ok) {
      install.stop(t("cli.plugin.spinner.install-failed"), 1)
      dep.log.error(t("cli.plugin.error.could-not-install", { module: mod }))
      const hit = cause(target.error) ?? target.error
      if (hit instanceof Process.RunFailedError) {
        const lines = hit.stderr
          .toString()
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
        const errs = lines.filter((line) => line.startsWith("error:")).map((line) => line.replace(/^error:\s*/, ""))
        const detail = errs[0] ?? lines.at(-1)
        if (detail) dep.log.error(detail)
        if (lines.some((line) => line.includes("No version matching"))) {
          dep.log.info(t("cli.plugin.info.registry-version"))
          dep.log.info(t("cli.plugin.info.check-npm"))
        }
      }
      if (!(hit instanceof Process.RunFailedError)) {
        dep.log.error(errorMessage(hit))
      }
      return false
    }
    install.stop(t("cli.plugin.spinner.package-ready"))

    const inspect = dep.spinner()
    inspect.start(t("cli.plugin.spinner.reading-manifest"))
    const manifest = await readPluginManifest(target.target)
    if (!manifest.ok) {
      if (manifest.code === "manifest_read_failed") {
        inspect.stop(t("cli.plugin.spinner.manifest-read-failed"), 1)
        dep.log.error(t("cli.plugin.error.manifest-read", { module: mod, file: manifest.file }))
        dep.log.error(errorMessage(cause(manifest.error) ?? manifest.error))
        return false
      }

      if (manifest.code === "manifest_no_targets") {
        inspect.stop(t("cli.plugin.spinner.no-targets"), 1)
        dep.log.error(t("cli.plugin.error.no-targets", { module: mod }))
        dep.log.info(t("cli.plugin.info.expected-entries"))
        return false
      }

      inspect.stop(t("cli.plugin.spinner.manifest-read-failed"), 1)
      return false
    }

    inspect.stop(
      `Detected ${manifest.targets.map((item) => item.kind).join(" + ")} target${manifest.targets.length === 1 ? "" : "s"}`,
    )

    const patch = dep.spinner()
    patch.start(t("cli.plugin.spinner.updating-config"))
    const out = await patchPluginConfig(
      {
        spec: mod,
        targets: manifest.targets,
        force,
        global,
        vcs: ctx.vcs,
        worktree: ctx.worktree,
        directory: ctx.directory,
        config: dep.global,
      },
      dep,
    )
    if (!out.ok) {
      if (out.code === "invalid_json") {
        patch.stop(t("cli.plugin.spinner.failed-update-kind", { kind: out.kind }), 1)
        dep.log.error(
          t("cli.plugin.error.invalid-json", { file: out.file, parse: out.parse, line: out.line, col: out.col }),
        )
        dep.log.info(t("cli.plugin.info.fix-config"))
        return false
      }

      patch.stop(t("cli.plugin.spinner.failed-update-config"), 1)
      dep.log.error(errorMessage(out.error))
      return false
    }
    patch.stop(t("cli.plugin.spinner.config-updated"))
    for (const item of out.items) {
      if (item.mode === "noop") {
        dep.log.info(t("cli.plugin.info.already-configured", { file: item.file }))
        continue
      }
      if (item.mode === "replace") {
        dep.log.info(t("cli.plugin.info.replaced", { file: item.file }))
        continue
      }
      dep.log.info(t("cli.plugin.info.added", { file: item.file }))
    }

    dep.log.success(t("cli.plugin.success.installed", { module: mod }))
    dep.log.info(
      global
        ? t("cli.plugin.info.scope-global", { dir: out.dir })
        : t("cli.plugin.info.scope-local", { dir: out.dir }),
    )
    return true
  }
}

export const PluginCommand = effectCmd({
  command: "plugin <module>",
  aliases: ["plug"],
  describe: t("cli.plugin.describe"),
  builder: (yargs) =>
    yargs
      .positional("module", {
        type: "string",
        describe: t("cli.plugin.positional.module"),
      })
      .option("global", {
        alias: ["g"],
        type: "boolean",
        default: false,
        describe: t("cli.plugin.option.global"),
      })
      .option("force", {
        alias: ["f"],
        type: "boolean",
        default: false,
        describe: t("cli.plugin.option.force"),
      }),
  handler: Effect.fn("Cli.plug")(function* (args) {
    const mod = String(args.module ?? "").trim()
    if (!mod) {
      UI.error(t("cli.plugin.error.module-required"))
      process.exitCode = 1
      return
    }

    UI.empty()
    intro(t("cli.plugin.intro", { module: mod }))

    const run = createPlugTask({
      mod,
      global: Boolean(args.global),
      force: Boolean(args.force),
    })

    const ctx = yield* InstanceRef
    if (!ctx) return
    const ok = yield* Effect.promise(() =>
      run({
        vcs: ctx.project.vcs,
        worktree: ctx.worktree,
        directory: ctx.directory,
      }),
    )

    outro(t("cli.plugin.outro.done"))
    if (!ok) process.exitCode = 1
  }),
})

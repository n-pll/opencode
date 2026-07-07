import { cmd } from "./cmd"
import { UI } from "@/cli/ui"
import { errorMessage } from "@opencode-ai/tui/util/error"
import { validateSession } from "../tui/validate-session"
import { ServerAuth } from "@/server/auth"
import { t } from "@/i18n"

export const AttachCommand = cmd({
  command: "attach <url>",
  describe: t("cli.attach.describe"),
  builder: (yargs) =>
    yargs
      .positional("url", {
        type: "string",
        describe: t("cli.attach.positional.url"),
        demandOption: true,
      })
      .option("dir", {
        type: "string",
        description: t("cli.attach.option.dir"),
      })
      .option("continue", {
        alias: ["c"],
        describe: t("cli.attach.option.continue"),
        type: "boolean",
      })
      .option("session", {
        alias: ["s"],
        type: "string",
        describe: t("cli.attach.option.session"),
      })
      .option("fork", {
        type: "boolean",
        describe: t("cli.attach.option.fork"),
      })
      .option("password", {
        alias: ["p"],
        type: "string",
        describe: t("cli.attach.option.password"),
      })
      .option("username", {
        alias: ["u"],
        type: "string",
        describe: t("cli.attach.option.username"),
      })
      .option("mini", {
        type: "boolean",
        describe: t("cli.attach.option.mini"),
        default: false,
      })
      .option("replay", {
        type: "boolean",
        hidden: true,
      })
      .option("no-replay", {
        type: "boolean",
        describe: t("cli.attach.option.no-replay"),
      })
      .option("replay-limit", {
        type: "number",
        describe: t("cli.attach.option.replay-limit"),
      }),
  handler: async (args) => {
    if (args.replay === true) {
      UI.error(t("cli.attach.error.replay-unsupported"))
      process.exitCode = 1
      return
    }
    const noReplay = args.replay === false || args.noReplay === true

    const directory = (() => {
      if (!args.dir) return undefined
      try {
        process.chdir(args.dir)
        return process.cwd()
      } catch {
        // If the directory doesn't exist locally (remote attach), pass it through.
        return args.dir
      }
    })()

    if (args.mini) {
      const { runMini } = await import("./run")
      await runMini({
        attach: args.url,
        directory,
        password: args.password,
        username: args.username,
        continue: args.continue,
        session: args.session,
        fork: args.fork,
        replay: noReplay ? false : undefined,
        replayLimit: args.replayLimit,
      })
      return
    }

    const unsupported = [
      ["--no-replay", noReplay],
      ["--replay-limit", args.replayLimit !== undefined],
    ].find((entry) => entry[1])?.[0]
    if (unsupported) {
      UI.error(t("cli.attach.error.option-requires-mini", { option: unsupported }))
      process.exitCode = 1
      return
    }

    const { TuiConfig } = await import("@/config/tui")
    if (args.fork && !args.continue && !args.session) {
      UI.error(t("cli.attach.error.fork-requires-continue"))
      process.exitCode = 1
      return
    }

    const headers = ServerAuth.headers({ password: args.password, username: args.username })
    const config = await TuiConfig.get()

    try {
      await validateSession({
        url: args.url,
        sessionID: args.session,
        directory,
        headers,
      })
    } catch (error) {
      UI.error(errorMessage(error))
      process.exitCode = 1
      return
    }

    const { Effect } = await import("effect")
    const { run } = await import("../tui/layer")
    const { createLegacyTuiPluginHost } = await import("@/plugin/tui/runtime")
    await Effect.runPromise(
      run({
        url: args.url,
        config,
        pluginHost: createLegacyTuiPluginHost(),
        args: {
          continue: args.continue,
          sessionID: args.session,
          fork: args.fork,
        },
        directory,
        headers,
      }),
    )
  },
})

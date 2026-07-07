import { Effect } from "effect"
import { cmd } from "./cmd"
import { effectCmd } from "../effect-cmd"
import { t } from "@/i18n"

export { extractResponseText, formatPromptTooLargeError, parseGitHubRemote } from "./github.shared"

export const GithubInstallCommand = effectCmd({
  command: "install",
  describe: t("cli.github.install.describe"),
  handler: () =>
    Effect.gen(function* () {
      const { githubInstall } = yield* Effect.promise(() => import("./github.handler"))
      return yield* githubInstall()
    }),
})

export const GithubRunCommand = effectCmd({
  command: "run",
  describe: t("cli.github.run.describe"),
  builder: (yargs) =>
    yargs
      .option("event", {
        type: "string",
        describe: t("cli.github.run.option.event"),
      })
      .option("token", {
        type: "string",
        describe: t("cli.github.run.option.token"),
      }),
  handler: (args) =>
    Effect.gen(function* () {
      const { githubRun } = yield* Effect.promise(() => import("./github.handler"))
      return yield* githubRun(args)
    }),
})

export const GithubCommand = cmd({
  command: "github",
  describe: t("cli.github.describe"),
  builder: (yargs) => yargs.command(GithubInstallCommand).command(GithubRunCommand).demandCommand(),
  async handler() {},
})

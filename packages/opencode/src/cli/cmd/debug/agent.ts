import { Effect } from "effect"
import { effectCmd } from "../../effect-cmd"
import { t } from "@/i18n"

export const AgentCommand = effectCmd({
  command: "agent <name>",
  describe: t("cli.debug.agent.describe"),
  builder: (yargs) =>
    yargs
      .positional("name", {
        type: "string",
        demandOption: true,
        description: t("cli.debug.agent.positional.name"),
      })
      .option("tool", {
        type: "string",
        description: t("cli.debug.agent.option.tool"),
      })
      .option("params", {
        type: "string",
        description: t("cli.debug.agent.option.params"),
      }),
  handler: (args) =>
    Effect.gen(function* () {
      const { debugAgent } = yield* Effect.promise(() => import("./agent.handler"))
      return yield* debugAgent(args)
    }),
})

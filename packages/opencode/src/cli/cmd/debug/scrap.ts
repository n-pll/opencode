import { EOL } from "os"
import { cmd } from "../cmd"
import { t } from "@/i18n"

export const ScrapCommand = cmd({
  command: "scrap",
  describe: t("cli.debug.scrap.describe"),
  builder: (yargs) => yargs,
  async handler() {
    const { Project } = await import("@/project/project")
    const { AppNodeBuilder } = await import("@opencode-ai/core/effect/app-node-builder")
    const { makeRuntime } = await import("@opencode-ai/core/effect/runtime")
    const runtime = makeRuntime(Project.Service, AppNodeBuilder.build(Project.node))
    const list = await runtime.runPromise((project) => project.list())
    process.stdout.write(JSON.stringify(list, null, 2) + EOL)
  },
})

import type { Argv } from "yargs"
import { UI } from "../ui"
import * as prompts from "@clack/prompts"
import { Installation } from "../../installation"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { t } from "@/i18n"

export const UpgradeCommand = {
  command: "upgrade [target]",
  describe: t("cli.upgrade.describe"),
  builder: (yargs: Argv) => {
    return yargs
      .positional("target", {
        describe: t("cli.upgrade.positional.target"),
        type: "string",
      })
      .option("method", {
        alias: "m",
        describe: t("cli.upgrade.option.method"),
        type: "string",
        choices: ["curl", "npm", "pnpm", "bun", "brew", "choco", "scoop"],
      })
  },
  handler: async (args: { target?: string; method?: string }) => {
    UI.empty()
    UI.println(UI.logo("  "))
    UI.empty()
    prompts.intro(t("cli.upgrade.intro"))
    const detectedMethod = await Installation.method()
    const method = (args.method as Installation.Method) ?? detectedMethod
    if (method === "unknown") {
      prompts.log.error(t("cli.upgrade.log.managed-by-pkgmgr", { execPath: process.execPath }))
      const install = await prompts.select({
        message: t("cli.upgrade.prompt.install-anyways"),
        options: [
          { label: t("cli.upgrade.option.yes"), value: true },
          { label: t("cli.upgrade.option.no"), value: false },
        ],
        initialValue: false,
      })
      if (!install) {
        prompts.outro(t("cli.upgrade.outro.done"))
        return
      }
    }
    prompts.log.info(t("cli.upgrade.log.using-method", { method }))
    const target = args.target ? args.target.replace(/^v/, "") : await Installation.latest()

    if (InstallationVersion === target) {
      prompts.log.warn(t("cli.upgrade.log.skipped-already-installed", { target }))
      prompts.outro(t("cli.upgrade.outro.done"))
      return
    }

    prompts.log.info(t("cli.upgrade.log.from-to", { from: InstallationVersion, to: target }))
    const spinner = prompts.spinner()
    spinner.start(t("cli.upgrade.spinner.upgrading"))
    const err = await Installation.upgrade(method, target).catch((err) => err)
    if (err) {
      spinner.stop(t("cli.upgrade.spinner.upgrade-failed"), 1)
      if (err instanceof Installation.UpgradeFailedError) {
        // necessary because choco only allows install/upgrade in elevated terminals
        if (method === "choco" && err.stderr.includes("not running from an elevated command shell")) {
          prompts.log.error(t("cli.upgrade.log.run-as-admin"))
        } else {
          prompts.log.error(err.stderr)
        }
      } else if (err instanceof Error) prompts.log.error(err.message)
      prompts.outro(t("cli.upgrade.outro.done"))
      return
    }
    spinner.stop(t("cli.upgrade.spinner.upgrade-complete"))
    prompts.outro(t("cli.upgrade.outro.done"))
  },
}

import yargs from "yargs"
import { TuiThreadCommand } from "./cli/cmd/tui"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { hideBin } from "yargs/helpers"
import { t } from "./i18n"
const cli = yargs(hideBin(process.argv))
  .parserConfiguration({ "populate--": true })
  .scriptName("opencode")
  .wrap(100)
  .help("help", t("cli.global.option.help"))
  .alias("help", "h")
  .version("version", t("cli.global.option.version"), InstallationVersion)
  .alias("version", "v")
  .option("print-logs", {
    describe: t("cli.global.option.print-logs"),
    type: "boolean",
  })
  .option("log-level", {
    describe: t("cli.global.option.log-level"),
    type: "string",
    choices: ["DEBUG", "INFO", "WARN", "ERROR"],
  })
  .option("pure", {
    describe: t("cli.global.option.pure"),
    type: "boolean",
  })
  .middleware((opts) => {
    if (opts.printLogs) process.env.OPENCODE_PRINT_LOGS = "1"
    if (opts.logLevel) process.env.OPENCODE_LOG_LEVEL = opts.logLevel
  })
  .command(TuiThreadCommand)
  .parse()

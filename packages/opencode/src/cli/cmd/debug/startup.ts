import { EOL } from "os"
import { cmd } from "../cmd"
import { t } from "@/i18n"

export const StartupCommand = cmd({
  command: "startup",
  describe: t("cli.debug.startup.describe"),
  builder: (yargs) => yargs,
  handler() {
    process.stdout.write(performance.now().toString() + EOL)
  },
})

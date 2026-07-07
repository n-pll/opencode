import { EOL } from "os"
import { Effect } from "effect"
import { Skill } from "../../../skill"
import { effectCmd } from "../../effect-cmd"
import { t } from "@/i18n"

export const SkillCommand = effectCmd({
  command: "skill",
  describe: t("cli.debug.skill.describe"),
  builder: (yargs) => yargs,
  handler: Effect.fn("Cli.debug.skill")(function* () {
    const skill = yield* Skill.Service
    const skills = yield* skill.all()
    process.stdout.write(JSON.stringify(skills, null, 2) + EOL)
  }),
})

import { Effect } from "effect"
import { Snapshot } from "../../../snapshot"
import { effectCmd } from "../../effect-cmd"
import { cmd } from "../cmd"
import { t } from "@/i18n"

export const SnapshotCommand = cmd({
  command: "snapshot",
  describe: t("cli.debug.snapshot.describe"),
  builder: (yargs) => yargs.command(TrackCommand).command(PatchCommand).command(DiffCommand).demandCommand(),
  async handler() {},
})

const TrackCommand = effectCmd({
  command: "track",
  describe: t("cli.debug.snapshot.track.describe"),
  handler: Effect.fn("Cli.debug.snapshot.track")(function* () {
    const out = yield* Snapshot.Service.use((svc) => svc.track())
    console.log(out)
  }),
})

const PatchCommand = effectCmd({
  command: "patch <hash>",
  describe: t("cli.debug.snapshot.patch.describe"),
  builder: (yargs) =>
    yargs.positional("hash", {
      type: "string",
      description: t("cli.debug.snapshot.patch.positional.hash"),
      demandOption: true,
    }),
  handler: Effect.fn("Cli.debug.snapshot.patch")(function* (args) {
    const out = yield* Snapshot.Service.use((svc) => svc.patch(args.hash))
    console.log(out)
  }),
})

const DiffCommand = effectCmd({
  command: "diff <hash>",
  describe: t("cli.debug.snapshot.diff.describe"),
  builder: (yargs) =>
    yargs.positional("hash", {
      type: "string",
      description: t("cli.debug.snapshot.diff.positional.hash"),
      demandOption: true,
    }),
  handler: Effect.fn("Cli.debug.snapshot.diff")(function* (args) {
    const out = yield* Snapshot.Service.use((svc) => svc.diff(args.hash))
    console.log(out)
  }),
})

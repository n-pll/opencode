export * as Config from "./config"

import { makeLocationNode } from "./effect/app-node"
import path from "path"
import { type ParseError, parse } from "jsonc-parser"
import { Context, Effect, Layer, Option, Schema } from "effect"
import { Permission } from "@opencode-ai/schema/permission"
import { FSUtil } from "./fs-util"
import { Global } from "./global"
import { Location } from "./location"
import { Policy } from "./policy"
import { AbsolutePath } from "./schema"
import { ConfigAgent } from "./config/agent"
import { ConfigAttachments } from "./config/attachments"
import { ConfigCompaction } from "./config/compaction"
import { ConfigCommand } from "./config/command"
import { ConfigExperimental } from "./config/experimental"
import { ConfigFormatter } from "./config/formatter"
import { ConfigLSP } from "./config/lsp"
import { ConfigMCP } from "./config/mcp"
import { ConfigPlugin } from "./config/plugin"
import { ConfigProvider } from "./config/provider"
import { ConfigReference } from "./config/reference"
import { ConfigToolOutput } from "./config/tool-output"
import { ConfigWatcher } from "./config/watcher"
import { ConfigV1 } from "./v1/config/config"
import { ConfigMigrateV1 } from "./v1/config/migrate"
import { t } from "./i18n"

export class Info extends Schema.Class<Info>("Config.Info")({
  $schema: Schema.optional(Schema.String).annotate({
    description: t("core.config.json_schema_reference_for_configuration_validation"),
  }),
  shell: Schema.String.pipe(Schema.optional).annotate({
    description: t("core.config.default_shell_to_use_for_terminal_and_shell_tool_execution"),
  }),
  model: Schema.String.pipe(Schema.optional).annotate({
    description: t("core.config.default_model_to_use_when_no_session_or_agent_model_is_selec"),
  }),
  default_agent: Schema.String.pipe(Schema.optional).annotate({
    description: t("core.config.default_primary_agent_to_use_when_no_session_agent_is_select"),
  }),
  autoupdate: Schema.Union([Schema.Boolean, Schema.Literal("notify")])
    .pipe(Schema.optional)
    .annotate({
      description: t("core.config.automatically_update_or_notify_when_a_new_version_is_availab"),
    }),
  share: Schema.Literals(["manual", "auto", "disabled"]).pipe(Schema.optional).annotate({
    description: "Control whether sessions may be shared manually, automatically, or not at all",
  }),
  enterprise: Schema.Struct({
    url: Schema.String.pipe(Schema.optional),
  })
    .pipe(Schema.optional)
    .annotate({
      description: t("core.config.enterprise_sharing_service_configuration"),
    }),
  username: Schema.String.pipe(Schema.optional).annotate({
    description: t("core.config.username_displayed_in_conversations_and_used_for_telemetry_i"),
  }),
  permissions: Permission.Ruleset.pipe(Schema.optional).annotate({
    description: t("core.config.ordered_tool_permission_rules_applied_to_agent_tool_use"),
  }),
  agents: Schema.Record(Schema.String, ConfigAgent.Info).pipe(Schema.optional).annotate({
    description: t("core.config.named_built_in_agent_overrides_and_custom_agent_definitions"),
  }),
  snapshots: Schema.Boolean.pipe(Schema.optional).annotate({
    description: t("core.config.enable_snapshots_used_for_undo_and_revert_behavior"),
  }),
  watcher: ConfigWatcher.Info.pipe(Schema.optional).annotate({
    description: t("core.config.filesystem_watcher_configuration"),
  }),
  formatter: ConfigFormatter.Info.pipe(Schema.optional).annotate({
    description: t("core.config.enable_built_in_formatters_or_configure_formatter_overrides"),
  }),
  lsp: ConfigLSP.Info.pipe(Schema.optional).annotate({
    description: t("core.config.enable_built_in_language_servers_or_configure_server_overrid"),
  }),
  attachments: ConfigAttachments.Info.pipe(Schema.optional).annotate({
    description: t("core.config.attachment_processing_configuration"),
  }),
  tool_output: ConfigToolOutput.Info.pipe(Schema.optional).annotate({
    description: t("core.config.tool_output_truncation_thresholds"),
  }),
  mcp: ConfigMCP.Info.pipe(Schema.optional).annotate({
    description: t("core.config.mcp_server_configuration"),
  }),
  compaction: ConfigCompaction.Info.pipe(Schema.optional).annotate({
    description: t("core.config.conversation_compaction_behavior"),
  }),
  skills: Schema.String.pipe(Schema.Array, Schema.optional).annotate({
    description: t("core.config.additional_paths_or_urls_to_discover_skills_from"),
  }),
  commands: Schema.Record(Schema.String, ConfigCommand.Info).pipe(Schema.optional).annotate({
    description: t("core.config.named_slash_command_definitions"),
  }),
  instructions: Schema.String.pipe(Schema.Array, Schema.optional).annotate({
    description: t("core.config.additional_paths_or_urls_supplying_ambient_instructions"),
  }),
  references: ConfigReference.Info.pipe(Schema.optional).annotate({
    description: t("core.config.named_local_directories_or_git_repositories_available_as_ext"),
  }),
  plugins: ConfigPlugin.Plugins.pipe(Schema.optional).annotate({
    description: t("core.config.ordered_external_plugin_packages_to_load"),
  }),
  experimental: ConfigExperimental.Experimental.pipe(Schema.optional),
  providers: Schema.Record(Schema.String, ConfigProvider.Info).pipe(Schema.optional),
}) {}

export class Document extends Schema.Class<Document>("Config.Document")({
  type: Schema.Literal("document"),
  path: Schema.String.pipe(Schema.optional),
  info: Info,
}) {}

export class Directory extends Schema.Class<Directory>("Config.Directory")({
  type: Schema.Literal("directory"),
  path: AbsolutePath,
}) {}

export type Entry = Document | Directory

export function latest<K extends keyof Info>(entries: readonly Entry[], key: K): Info[K] | undefined {
  return entries
    .filter((entry): entry is Document => entry.type === "document")
    .findLast((entry) => entry.info[key] !== undefined)?.info[key]
}

export interface Interface {
  /** Returns location config documents and supplemental directories from lowest to highest priority. */
  readonly entries: () => Effect.Effect<Entry[]>
}

export class Service extends Context.Service<Service, Interface>()("@opencode/v2/Config") {}

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const fs = yield* FSUtil.Service
    const global = yield* Global.Service
    const location = yield* Location.Service
    const policy = yield* Policy.Service
    const names = ["opencode.json", "opencode.jsonc"]
    const decodeOptions = { errors: "all", onExcessProperty: "ignore", propertyOrder: "original" } as const
    const decodeInfo = Schema.decodeUnknownOption(Info, decodeOptions)
    const decodeV1Info = Schema.decodeUnknownOption(ConfigV1.Info, decodeOptions)

    const loadFile = Effect.fnUntraced(function* (filepath: string) {
      const text = yield* fs.readFileStringSafe(filepath)
      if (!text) return

      const errors: ParseError[] = []
      const input: unknown = parse(text, errors, { allowTrailingComma: true })
      if (errors.length) return

      const info = Option.getOrUndefined(
        ConfigMigrateV1.isV1(input)
          ? decodeV1Info(input).pipe(Option.map(ConfigMigrateV1.migrate), Option.flatMap(decodeInfo))
          : decodeInfo(input),
      )
      if (!info) return
      return new Document({ type: "document", path: filepath, info })
    })

    const loadDirectory = Effect.fnUntraced(function* (directory: AbsolutePath) {
      return [
        ...(yield* Effect.forEach(names, (file) => loadFile(path.join(directory, file))).pipe(
          Effect.map((configs) => configs.filter((config): config is Document => config !== undefined)),
        )),
        new Directory({ type: "directory", path: directory }),
      ]
    })

    const globalDirectory = AbsolutePath.make(global.config)
    const locationIsGlobal = path.resolve(location.directory) === path.resolve(global.config)
    // Read configuration once when this location opens. Later calls reuse these
    // values until the location is reopened.
    const discovered = locationIsGlobal
      ? []
      : yield* fs
          .up({
            targets: [".opencode", ...names.toReversed()],
            start: location.directory,
            stop: location.project.directory,
          })
          .pipe(Effect.orDie)
    const directories = [
      globalDirectory,
      ...discovered
        .filter((item) => path.basename(item) === ".opencode")
        .toReversed()
        .map((directory) => AbsolutePath.make(directory)),
    ]
    // A config closer to the opened directory should win over one higher up.
    // Search starts nearby, so reverse the results before applying them.
    const directPaths = discovered.filter((item) => path.basename(item) !== ".opencode").toReversed()
    const direct = yield* Effect.forEach(directPaths, loadFile).pipe(
      Effect.orDie,
      Effect.map((configs) => configs.filter((config): config is Document => config !== undefined)),
    )
    const supplementary = yield* Effect.forEach(directories, loadDirectory).pipe(Effect.orDie)
    // Apply general settings first and more specific settings last:
    // global config, project files, then `.opencode` files.
    const configs = [...(supplementary[0] ?? []), ...direct, ...supplementary.slice(1).flat()]
    // Rules use the opposite order so a user-global rule can override a
    // repository rule. Statement order inside each file stays unchanged.
    yield* policy.load(
      configs
        .filter((config): config is Document => config.type === "document")
        .toReversed()
        .flatMap((config) => config.info.experimental?.policies ?? []),
    )

    return Service.of({
      entries: Effect.fn("Config.entries")(function* () {
        return configs
      }),
    })
  }),
)

export const locationLayer = layer.pipe(Layer.provideMerge(Policy.locationLayer))

export const node = makeLocationNode({
  service: Service,
  layer,
  deps: [FSUtil.node, Global.node, Location.node, Policy.node],
})

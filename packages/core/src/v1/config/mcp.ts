export * as ConfigMCPV1 from "./mcp"

import { Schema } from "effect"
import { PositiveInt } from "../../schema"
import { t } from "../../i18n"

export const Local = Schema.Struct({
  type: Schema.Literal("local").annotate({ description: t("core.config.type_of_mcp_server_connection") }),
  command: Schema.mutable(Schema.Array(Schema.String)).annotate({
    description: t("core.config.command_and_arguments_to_run_the_mcp_server"),
  }),
  cwd: Schema.optional(Schema.String).annotate({
    description: t("core.config.working_directory_for_the_mcp_server_process_relative_paths_"),
  }),
  environment: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
    description: t("core.config.environment_variables_to_set_when_running_the_mcp_server"),
  }),
  enabled: Schema.optional(Schema.Boolean).annotate({
    description: t("core.config.enable_or_disable_the_mcp_server_on_startup"),
  }),
  timeout: Schema.optional(PositiveInt).annotate({
    description: t("core.config.timeout_in_ms_for_mcp_server_requests_defaults_to_5000_5_sec"),
  }),
}).annotate({ identifier: "McpLocalConfig" })
export type Local = Schema.Schema.Type<typeof Local>

export const OAuth = Schema.Struct({
  clientId: Schema.optional(Schema.String).annotate({
    description: "OAuth client ID. If not provided, dynamic client registration (RFC 7591) will be attempted.",
  }),
  clientSecret: Schema.optional(Schema.String).annotate({
    description: t("core.config.oauth_client_secret_if_required_by_the_authorization_server"),
  }),
  scope: Schema.optional(Schema.String).annotate({ description: t("core.config.oauth_scopes_to_request_during_authorization") }),
  callbackPort: Schema.optional(Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 65535 }))).annotate({
    description:
      "Port for the local OAuth callback server (default: 19876). Shorthand for redirectUri when only the port needs changing. Ignored if redirectUri is set.",
  }),
  redirectUri: Schema.optional(Schema.String).annotate({
    description: "OAuth redirect URI (default: http://127.0.0.1:19876/mcp/oauth/callback).",
  }),
}).annotate({ identifier: "McpOAuthConfig" })
export type OAuth = Schema.Schema.Type<typeof OAuth>

export const Remote = Schema.Struct({
  type: Schema.Literal("remote").annotate({ description: t("core.config.type_of_mcp_server_connection") }),
  url: Schema.String.annotate({ description: t("core.config.url_of_the_remote_mcp_server") }),
  enabled: Schema.optional(Schema.Boolean).annotate({
    description: t("core.config.enable_or_disable_the_mcp_server_on_startup"),
  }),
  headers: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
    description: t("core.config.headers_to_send_with_the_request"),
  }),
  oauth: Schema.optional(Schema.Union([OAuth, Schema.Literal(false)])).annotate({
    description: t("core.config.oauth_authentication_configuration_for_the_mcp_server_set_to"),
  }),
  timeout: Schema.optional(PositiveInt).annotate({
    description: t("core.config.timeout_in_ms_for_mcp_server_requests_defaults_to_5000_5_sec"),
  }),
}).annotate({ identifier: "McpRemoteConfig" })
export type Remote = Schema.Schema.Type<typeof Remote>

export const Info = Schema.Union([Local, Remote]).annotate({ discriminator: "type" })
export type Info = Schema.Schema.Type<typeof Info>

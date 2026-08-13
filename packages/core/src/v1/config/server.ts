export * as ConfigServerV1 from "./server"

import { Schema } from "effect"
import { PositiveInt } from "../../schema"
import { t } from "../../i18n"

export const Server = Schema.Struct({
  port: Schema.optional(PositiveInt).annotate({
    description: t("core.config.port_to_listen_on"),
  }),
  hostname: Schema.optional(Schema.String).annotate({ description: t("core.config.hostname_to_listen_on") }),
  mdns: Schema.optional(Schema.Boolean).annotate({ description: t("core.config.enable_mdns_service_discovery") }),
  mdnsDomain: Schema.optional(Schema.String).annotate({
    description: "Custom domain name for mDNS service (default: opencode.local)",
  }),
  cors: Schema.optional(Schema.mutable(Schema.Array(Schema.String))).annotate({
    description: t("core.config.additional_domains_to_allow_for_cors"),
  }),
}).annotate({ identifier: "ServerConfig" })
export type Server = Schema.Schema.Type<typeof Server>

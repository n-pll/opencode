import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { t } from "../i18n"

export const HealthGroup = HttpApiGroup.make("server.health").add(
  HttpApiEndpoint.get("health.get", "/api/health", {
    success: Schema.Struct({ healthy: Schema.Literal(true) }),
  }).annotateMerge(
    OpenApi.annotations({
      identifier: "v2.health.get",
      summary: t("protocol.health.health_get.summary"),
      description: t("protocol.health.health_get.description"),
    }),
  ),
)

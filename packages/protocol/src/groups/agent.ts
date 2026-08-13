import { Agent } from "@opencode-ai/schema/agent"
import { Location } from "@opencode-ai/schema/location"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { LocationQuery, locationQueryOpenApi } from "./location"
import { t } from "../i18n"

export const AgentGroup = HttpApiGroup.make("server.agent").add(
  HttpApiEndpoint.get("agent.list", "/api/agent", {
    query: LocationQuery,
    success: Location.response(Schema.Array(Agent.Info)),
  })
    .annotateMerge(locationQueryOpenApi)
    .annotateMerge(
      OpenApi.annotations({
        identifier: "v2.agent.list",
        summary: t("protocol.agent.agent_list.summary"),
        description: t("protocol.agent.agent_list.description"),
      }),
    ),
)

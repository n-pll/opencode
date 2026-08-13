import { Integration } from "@opencode-ai/schema/integration"
import { Location } from "@opencode-ai/schema/location"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { InvalidRequestError } from "../errors"
import { LocationQuery, locationQueryOpenApi } from "./location"
import { t } from "../i18n"

const Inputs = Schema.Record(Schema.String, Schema.String)

export const IntegrationGroup = HttpApiGroup.make("server.integration")
  .add(
    HttpApiEndpoint.get("integration.list", "/api/integration", {
      query: LocationQuery,
      success: Location.response(Schema.Array(Integration.Info)),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.integration.list",
          summary: t("protocol.integration.integration_list.summary"),
          description: t("protocol.integration.integration_list.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.get("integration.get", "/api/integration/:integrationID", {
      params: { integrationID: Integration.ID },
      query: LocationQuery,
      success: Location.response(Schema.UndefinedOr(Integration.Info)),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.integration.get",
          summary: t("protocol.integration.integration_get.summary"),
          description: t("protocol.integration.integration_get.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.post("integration.connect.key", "/api/integration/:integrationID/connect/key", {
      params: { integrationID: Integration.ID },
      query: LocationQuery,
      payload: Schema.Struct({
        key: Schema.String,
        label: Schema.optional(Schema.String),
      }),
      success: HttpApiSchema.NoContent,
      error: InvalidRequestError,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.integration.connect.key",
          summary: t("protocol.integration.integration_connect_key.summary"),
          description: t("protocol.integration.integration_connect_key.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.post("integration.connect.oauth", "/api/integration/:integrationID/connect/oauth", {
      params: { integrationID: Integration.ID },
      query: LocationQuery,
      payload: Schema.Struct({
        methodID: Integration.MethodID,
        inputs: Inputs,
        label: Schema.optional(Schema.String),
      }),
      success: Location.response(Integration.Attempt),
      error: InvalidRequestError,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.integration.connect.oauth",
          summary: t("protocol.integration.integration_connect_oauth.summary"),
          description: t("protocol.integration.integration_connect_oauth.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.get("integration.attempt.status", "/api/integration/attempt/:attemptID", {
      params: { attemptID: Integration.AttemptID },
      query: LocationQuery,
      success: Location.response(Integration.AttemptStatus),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.integration.attempt.status",
          summary: t("protocol.integration.integration_attempt_status.summary"),
          description: t("protocol.integration.integration_attempt_status.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.post("integration.attempt.complete", "/api/integration/attempt/:attemptID/complete", {
      params: { attemptID: Integration.AttemptID },
      query: LocationQuery,
      payload: Schema.Struct({ code: Schema.optional(Schema.String) }),
      success: HttpApiSchema.NoContent,
      error: InvalidRequestError,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.integration.attempt.complete",
          summary: t("protocol.integration.integration_attempt_complete.summary"),
          description: t("protocol.integration.integration_attempt_complete.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.delete("integration.attempt.cancel", "/api/integration/attempt/:attemptID", {
      params: { attemptID: Integration.AttemptID },
      query: LocationQuery,
      success: HttpApiSchema.NoContent,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.integration.attempt.cancel",
          summary: t("protocol.integration.integration_attempt_cancel.summary"),
          description: t("protocol.integration.integration_attempt_cancel.description"),
        }),
      ),
  )
  .annotateMerge(
    OpenApi.annotations({ title: "integrations", description: t("protocol.integration.integrations.description") }),
  )

import { Pty } from "@opencode-ai/schema/pty"
import { PtyTicket } from "@opencode-ai/schema/pty-ticket"
import { Location } from "@opencode-ai/schema/location"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { ForbiddenError, PtyNotFoundError } from "../errors"
import { LocationQuery, locationQueryOpenApi } from "./location"
import { t } from "../i18n"

export const PTY_CONNECT_TICKET_QUERY = "ticket"
export const PTY_CONNECT_TOKEN_HEADER = "x-opencode-ticket"
export const PTY_CONNECT_TOKEN_HEADER_VALUE = "1"

const PTY_CONNECT_PATH = /^\/api\/pty\/[^/]+\/connect$/

// Authorization middleware skips credential checks when this matches; the PTY connect handler
// is then responsible for consuming and validating the ticket.
export function hasPtyConnectTicketURL(url: URL) {
  return PTY_CONNECT_PATH.test(url.pathname) && !!url.searchParams.get(PTY_CONNECT_TICKET_QUERY)
}

export const PtyGroup = HttpApiGroup.make("server.pty")
  .add(
    HttpApiEndpoint.get("pty.list", "/api/pty", {
      query: LocationQuery,
      success: Location.response(Schema.Array(Pty.Info)),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.pty.list",
          summary: t("protocol.pty.pty_list.summary"),
          description: t("protocol.pty.pty_list.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.post("pty.create", "/api/pty", {
      query: LocationQuery,
      payload: Pty.CreateInput,
      success: Location.response(Pty.Info),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.pty.create",
          summary: t("protocol.pty.pty_create.summary"),
          description: t("protocol.pty.pty_create.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.get("pty.get", "/api/pty/:ptyID", {
      params: { ptyID: Pty.ID },
      query: LocationQuery,
      success: Location.response(Pty.Info),
      error: PtyNotFoundError,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.pty.get",
          summary: t("protocol.pty.pty_get.summary"),
          description: t("protocol.pty.pty_get.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.put("pty.update", "/api/pty/:ptyID", {
      params: { ptyID: Pty.ID },
      query: LocationQuery,
      payload: Pty.UpdateInput,
      success: Location.response(Pty.Info),
      error: PtyNotFoundError,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.pty.update",
          summary: t("protocol.pty.pty_update.summary"),
          description: t("protocol.pty.pty_update.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.delete("pty.remove", "/api/pty/:ptyID", {
      params: { ptyID: Pty.ID },
      query: LocationQuery,
      success: HttpApiSchema.NoContent,
      error: PtyNotFoundError,
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.pty.remove",
          summary: t("protocol.pty.pty_remove.summary"),
          description: t("protocol.pty.pty_remove.description"),
        }),
      ),
  )
  .add(
    HttpApiEndpoint.post("pty.connectToken", "/api/pty/:ptyID/connect-token", {
      params: { ptyID: Pty.ID },
      query: LocationQuery,
      success: Location.response(PtyTicket.ConnectToken),
      error: [ForbiddenError, PtyNotFoundError],
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.pty.connectToken",
          summary: t("protocol.pty.pty_connectToken.summary"),
          description: t("protocol.pty.pty_connectToken.description"),
        }),
      ),
  )
  .add(
    // Query fields are decoded in the raw handler after the existence check so a missing
    // session responds with an empty 404 before any upgrade work.
    HttpApiEndpoint.get("pty.connect", "/api/pty/:ptyID/connect", {
      params: { ptyID: Pty.ID },
      success: Schema.Boolean,
      error: [ForbiddenError, PtyNotFoundError],
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "v2.pty.connect",
        summary: t("protocol.pty.pty_connect.summary"),
        description: t("protocol.pty.pty_connect.description"),
        transform: (operation) => ({
          ...operation,
          "x-websocket": true,
          parameters: [
            ...(operation.parameters ?? []),
            ...["location[directory]", "location[workspace]", "cursor", PTY_CONNECT_TICKET_QUERY].map((name) => ({
              in: "query",
              name,
              schema: { type: "string" },
            })),
          ],
        }),
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "pty", description: t("protocol.pty.pty.description") }))

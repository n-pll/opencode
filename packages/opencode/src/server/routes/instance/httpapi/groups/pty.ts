import { Pty } from "@opencode-ai/core/pty"
import { PtyTicket } from "@opencode-ai/core/pty/ticket"
import { PtyID } from "@opencode-ai/core/pty/schema"
import { PTY_CONNECT_TICKET_QUERY } from "@/server/shared/pty-ticket"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization, PtyConnectAuthorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
  WorkspaceRoutingQueryFields,
} from "../middleware/workspace-routing"
import { PtyForbiddenError, PtyNotFoundError } from "../errors"
import { described } from "./metadata"
import { t } from "@/i18n"

const root = "/pty"
export const Params = Schema.Struct({ ptyID: PtyID })
export const CursorQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  cursor: Schema.optional(Schema.String),
})
export const ShellItem = Schema.Struct({
  path: Schema.String,
  name: Schema.String,
  acceptable: Schema.Boolean,
})

export const PtyPaths = {
  shells: `${root}/shells`,
  list: root,
  create: root,
  get: `${root}/:ptyID`,
  update: `${root}/:ptyID`,
  remove: `${root}/:ptyID`,
  connectToken: `${root}/:ptyID/connect-token`,
  connect: `${root}/:ptyID/connect`,
} as const

export const PtyApi = HttpApi.make("pty")
  .add(
    HttpApiGroup.make("pty")
      .add(
        HttpApiEndpoint.get("shells", PtyPaths.shells, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(ShellItem), "List of shells"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "pty.shells",
            summary: t("instance.pty.pty_shells.summary"),
            description: t("instance.pty.pty_shells.description"),
          }),
        ),
        HttpApiEndpoint.get("list", PtyPaths.list, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(Pty.Info), "List of sessions"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "pty.list",
            summary: t("instance.pty.pty_list.summary"),
            description: t("instance.pty.pty_list.description"),
          }),
        ),
        HttpApiEndpoint.post("create", PtyPaths.create, {
          query: WorkspaceRoutingQuery,
          payload: Pty.CreateInput,
          success: described(Pty.Info, "Created session"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "pty.create",
            summary: t("instance.pty.pty_create.summary"),
            description: t("instance.pty.pty_create.description"),
          }),
        ),
        HttpApiEndpoint.get("get", PtyPaths.get, {
          params: { ptyID: PtyID },
          query: WorkspaceRoutingQuery,
          success: described(Pty.Info, "Session info"),
          error: PtyNotFoundError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "pty.get",
            summary: t("instance.pty.pty_get.summary"),
            description: t("instance.pty.pty_get.description"),
          }),
        ),
        HttpApiEndpoint.put("update", PtyPaths.update, {
          params: { ptyID: PtyID },
          query: WorkspaceRoutingQuery,
          payload: Pty.UpdateInput,
          success: described(Pty.Info, "Updated session"),
          error: [PtyNotFoundError, HttpApiError.BadRequest],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "pty.update",
            summary: t("instance.pty.pty_update.summary"),
            description: t("instance.pty.pty_update.description"),
          }),
        ),
        HttpApiEndpoint.delete("remove", PtyPaths.remove, {
          params: { ptyID: PtyID },
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Session removed"),
          error: PtyNotFoundError,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "pty.remove",
            summary: t("instance.pty.pty_remove.summary"),
            description: t("instance.pty.pty_remove.description"),
          }),
        ),
        HttpApiEndpoint.post("connectToken", PtyPaths.connectToken, {
          params: { ptyID: PtyID },
          query: WorkspaceRoutingQuery,
          success: described(PtyTicket.ConnectToken, "WebSocket connect token"),
          error: [PtyForbiddenError, PtyNotFoundError],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "pty.connectToken",
            summary: t("instance.pty.pty_connectToken.summary"),
            description: t("instance.pty.pty_connectToken.description"),
          }),
        ),
      )
      .annotateMerge(OpenApi.annotations({ title: "pty", description: t("instance.pty.pty_0.description") }))
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode experimental HttpApi",
      version: "0.0.1",
      description: t("instance.config.config_1.description"),
    }),
  )

export const PtyConnectApi = HttpApi.make("pty-connect").add(
  HttpApiGroup.make("pty-connect")
    .add(
      // Decode PTY connection query fields in the raw handler after checking
      // existence, preserving the established empty-404 response ordering.
      HttpApiEndpoint.get("connect", PtyPaths.connect, {
        params: Params,
        success: described(Schema.Boolean, "Connected session"),
        error: [HttpApiError.Forbidden, HttpApiError.NotFound],
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "pty.connect",
          summary: t("instance.pty.pty_connect.summary"),
          description:
            t("cli.pty.establish-a-websocket-connection-to-interact-with-a-pseudo-t"),
          transform: (operation) => ({
            ...operation,
            parameters: [
              ...(operation.parameters ?? []),
              ...["directory", "workspace", "cursor", PTY_CONNECT_TICKET_QUERY].map((name) => ({
                in: "query",
                name,
                schema: { type: "string" },
              })),
            ],
          }),
        }),
      ),
    )
    .annotateMerge(OpenApi.annotations({ title: "pty", description: t("instance.pty.pty_2.description") }))
    .middleware(InstanceContextMiddleware)
    .middleware(WorkspaceRoutingMiddleware)
    .middleware(PtyConnectAuthorization),
)

import { Workspace } from "@/control-plane/workspace"
import { WorkspaceAdapterEntry } from "@/control-plane/types"
import { Schema, Struct } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { ApiVcsApplyError } from "./instance"
import { ApiNotFoundError } from "../errors"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware, WorkspaceRoutingQuery } from "../middleware/workspace-routing"
import { described } from "./metadata"
import { t } from "@/i18n"

const root = "/experimental/workspace"
export const CreatePayload = Schema.Struct(Struct.omit(Workspace.CreateInput.fields, ["projectID"]))
export const WarpPayload = Schema.Struct({
  id: Schema.NullOr(Workspace.Info.fields.id),
  sessionID: Workspace.SessionWarpInput.fields.sessionID,
  copyChanges: Workspace.SessionWarpInput.fields.copyChanges,
})

export class ApiWorkspaceWarpError extends Schema.ErrorClass<ApiWorkspaceWarpError>("WorkspaceWarpError")(
  {
    name: Schema.Literal("WorkspaceWarpError"),
    data: Schema.Struct({
      message: Schema.String,
    }),
  },
  { httpApiStatus: 400 },
) {}

export class ApiWorkspaceCreateError extends Schema.ErrorClass<ApiWorkspaceCreateError>("WorkspaceCreateError")(
  {
    name: Schema.Literal("WorkspaceCreateError"),
    data: Schema.Struct({
      message: Schema.String,
    }),
  },
  { httpApiStatus: 400 },
) {}

export const WorkspacePaths = {
  adapters: `${root}/adapter`,
  list: root,
  syncList: `${root}/sync-list`,
  status: `${root}/status`,
  remove: `${root}/:id`,
  warp: `${root}/warp`,
} as const

export const WorkspaceApi = HttpApi.make("workspace")
  .add(
    HttpApiGroup.make("workspace")
      .add(
        HttpApiEndpoint.get("adapters", WorkspacePaths.adapters, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(WorkspaceAdapterEntry), "Workspace adapters"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.workspace.adapter.list",
            summary: t("instance.workspace.experimental_workspace_adapter_list.summary"),
            description: t("instance.workspace.experimental_workspace_adapter_list.description"),
          }),
        ),
        HttpApiEndpoint.get("list", WorkspacePaths.list, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(Workspace.Info), "Workspaces"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.workspace.list",
            summary: t("instance.workspace.experimental_workspace_list.summary"),
            description: t("instance.workspace.experimental_workspace_list.description"),
          }),
        ),
        HttpApiEndpoint.post("create", WorkspacePaths.list, {
          query: WorkspaceRoutingQuery,
          payload: CreatePayload,
          success: described(Workspace.Info, "Workspace created"),
          error: [ApiWorkspaceCreateError, HttpApiError.BadRequest],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.workspace.create",
            summary: t("instance.workspace.experimental_workspace_create.summary"),
            description: t("instance.workspace.experimental_workspace_create.description"),
          }),
        ),
        HttpApiEndpoint.post("syncList", WorkspacePaths.syncList, {
          query: WorkspaceRoutingQuery,
          success: described(HttpApiSchema.NoContent, "Workspace list synced"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.workspace.syncList",
            summary: t("instance.workspace.experimental_workspace_syncList.summary"),
            description: t("instance.workspace.experimental_workspace_syncList.description"),
          }),
        ),
        HttpApiEndpoint.get("status", WorkspacePaths.status, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(Workspace.ConnectionStatus), "Workspace status"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.workspace.status",
            summary: t("instance.workspace.experimental_workspace_status.summary"),
            description: t("instance.workspace.experimental_workspace_status.description"),
          }),
        ),
        HttpApiEndpoint.delete("remove", WorkspacePaths.remove, {
          params: { id: Workspace.Info.fields.id },
          query: WorkspaceRoutingQuery,
          success: described(Schema.UndefinedOr(Workspace.Info), "Workspace removed"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.workspace.remove",
            summary: t("instance.workspace.experimental_workspace_remove.summary"),
            description: t("instance.workspace.experimental_workspace_remove.description"),
          }),
        ),
        HttpApiEndpoint.post("warp", WorkspacePaths.warp, {
          query: WorkspaceRoutingQuery,
          payload: WarpPayload,
          success: described(HttpApiSchema.NoContent, "Session warped"),
          error: [ApiWorkspaceWarpError, ApiVcsApplyError, ApiNotFoundError],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "experimental.workspace.warp",
            summary: t("instance.workspace.experimental_workspace_warp.summary"),
            description: t("instance.workspace.experimental_workspace_warp.description"),
          }),
        ),
      )
      .annotateMerge(OpenApi.annotations({ title: "workspace", description: t("instance.workspace.workspace_0.description") }))
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

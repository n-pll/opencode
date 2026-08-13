import { TuiEvent } from "@/server/tui-event"
import { TuiRequest as TuiRequestPayload } from "@/server/shared/tui-control"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware, WorkspaceRoutingQuery } from "../middleware/workspace-routing"
import { ApiNotFoundError } from "../errors"
import { described } from "./metadata"
import { t } from "@/i18n"

const root = "/tui"
export const CommandPayload = Schema.Struct({ command: Schema.String })
const EventTuiPromptAppend = Schema.Struct({
  type: Schema.Literal(TuiEvent.PromptAppend.type),
  properties: TuiEvent.PromptAppend.data,
}).annotate({ identifier: "EventTuiPromptAppend" })
const EventTuiCommandExecute = Schema.Struct({
  type: Schema.Literal(TuiEvent.CommandExecute.type),
  properties: TuiEvent.CommandExecute.data,
}).annotate({ identifier: "EventTuiCommandExecute" })
const EventTuiToastShow = Schema.Struct({
  type: Schema.Literal(TuiEvent.ToastShow.type),
  properties: TuiEvent.ToastShow.data,
}).annotate({ identifier: "EventTuiToastShow" })
const EventTuiSessionSelect = Schema.Struct({
  type: Schema.Literal(TuiEvent.SessionSelect.type),
  properties: TuiEvent.SessionSelect.data,
}).annotate({ identifier: "EventTuiSessionSelect" })
export const TuiPublishPayload = Schema.Union([
  EventTuiPromptAppend,
  EventTuiCommandExecute,
  EventTuiToastShow,
  EventTuiSessionSelect,
])

export const TuiPaths = {
  appendPrompt: `${root}/append-prompt`,
  openHelp: `${root}/open-help`,
  openSessions: `${root}/open-sessions`,
  openThemes: `${root}/open-themes`,
  openModels: `${root}/open-models`,
  submitPrompt: `${root}/submit-prompt`,
  clearPrompt: `${root}/clear-prompt`,
  executeCommand: `${root}/execute-command`,
  showToast: `${root}/show-toast`,
  publish: `${root}/publish`,
  selectSession: `${root}/select-session`,
  controlNext: `${root}/control/next`,
  controlResponse: `${root}/control/response`,
} as const

export const TuiApi = HttpApi.make("tui")
  .add(
    HttpApiGroup.make("tui")
      .add(
        HttpApiEndpoint.post("appendPrompt", TuiPaths.appendPrompt, {
          query: WorkspaceRoutingQuery,
          payload: TuiEvent.PromptAppend.data,
          success: described(Schema.Boolean, "Prompt processed successfully"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.appendPrompt",
            summary: t("instance.tui.tui_appendPrompt.summary"),
            description: t("instance.tui.tui_appendPrompt.description"),
          }),
        ),
        HttpApiEndpoint.post("openHelp", TuiPaths.openHelp, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Help dialog opened successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.openHelp",
            summary: t("instance.tui.tui_openHelp.summary"),
            description: t("instance.tui.tui_openHelp.description"),
          }),
        ),
        HttpApiEndpoint.post("openSessions", TuiPaths.openSessions, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Session dialog opened successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.openSessions",
            summary: t("instance.tui.tui_openSessions.summary"),
            description: t("instance.tui.tui_openSessions.description"),
          }),
        ),
        HttpApiEndpoint.post("openThemes", TuiPaths.openThemes, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Theme dialog opened successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.openThemes",
            summary: t("instance.tui.tui_openThemes.summary"),
            description: t("instance.tui.tui_openThemes.description"),
          }),
        ),
        HttpApiEndpoint.post("openModels", TuiPaths.openModels, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Model dialog opened successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.openModels",
            summary: t("instance.tui.tui_openModels.summary"),
            description: t("instance.tui.tui_openModels.description"),
          }),
        ),
        HttpApiEndpoint.post("submitPrompt", TuiPaths.submitPrompt, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Prompt submitted successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.submitPrompt",
            summary: t("instance.tui.tui_submitPrompt.summary"),
            description: t("instance.tui.tui_submitPrompt.description"),
          }),
        ),
        HttpApiEndpoint.post("clearPrompt", TuiPaths.clearPrompt, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Prompt cleared successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.clearPrompt",
            summary: t("instance.tui.tui_clearPrompt.summary"),
            description: t("instance.tui.tui_clearPrompt.description"),
          }),
        ),
        HttpApiEndpoint.post("executeCommand", TuiPaths.executeCommand, {
          query: WorkspaceRoutingQuery,
          payload: CommandPayload,
          success: described(Schema.Boolean, "Command executed successfully"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.executeCommand",
            summary: t("instance.tui.tui_executeCommand.summary"),
            description: t("instance.tui.tui_executeCommand.description"),
          }),
        ),
        HttpApiEndpoint.post("showToast", TuiPaths.showToast, {
          query: WorkspaceRoutingQuery,
          payload: TuiEvent.ToastShow.data,
          success: described(Schema.Boolean, "Toast notification shown successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.showToast",
            summary: t("instance.tui.tui_showToast.summary"),
            description: t("instance.tui.tui_showToast.description"),
          }),
        ),
        HttpApiEndpoint.post("publish", TuiPaths.publish, {
          query: WorkspaceRoutingQuery,
          payload: TuiPublishPayload,
          success: described(Schema.Boolean, "Event published successfully"),
          error: HttpApiError.BadRequest,
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.publish",
            summary: t("instance.tui.tui_publish.summary"),
            description: t("instance.tui.tui_publish.description"),
          }),
        ),
        HttpApiEndpoint.post("selectSession", TuiPaths.selectSession, {
          query: WorkspaceRoutingQuery,
          payload: TuiEvent.SessionSelect.data,
          success: described(Schema.Boolean, "Session selected successfully"),
          error: [HttpApiError.BadRequest, ApiNotFoundError],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.selectSession",
            summary: t("instance.tui.tui_selectSession.summary"),
            description: t("instance.tui.tui_selectSession.description"),
          }),
        ),
        HttpApiEndpoint.get("controlNext", TuiPaths.controlNext, {
          query: WorkspaceRoutingQuery,
          success: described(TuiRequestPayload, "Next TUI request"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.control.next",
            summary: t("instance.tui.tui_control_next.summary"),
            description: t("instance.tui.tui_control_next.description"),
          }),
        ),
        HttpApiEndpoint.post("controlResponse", TuiPaths.controlResponse, {
          query: WorkspaceRoutingQuery,
          payload: Schema.Unknown,
          success: described(Schema.Boolean, "Response submitted successfully"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "tui.control.response",
            summary: t("instance.tui.tui_control_response.summary"),
            description: t("instance.tui.tui_control_response.description"),
          }),
        ),
      )
      .annotateMerge(OpenApi.annotations({ title: "tui", description: t("instance.tui.tui_0.description") }))
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

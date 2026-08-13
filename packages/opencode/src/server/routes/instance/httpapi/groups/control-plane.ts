import { MoveSession } from "@opencode-ai/core/control-plane/move-session"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { described } from "./metadata"
import { t } from "@/i18n"

const root = "/experimental/control-plane"
export const MoveSessionPayload = Schema.Struct({ ...MoveSession.Input.fields })

export class ApiMoveSessionError extends Schema.ErrorClass<ApiMoveSessionError>("MoveSessionError")(
  {
    name: Schema.Literal("MoveSessionError"),
    data: Schema.Struct({
      message: Schema.String,
    }),
  },
  { httpApiStatus: 400 },
) {}

export const ControlPlaneApi = HttpApi.make("controlPlane").add(
  HttpApiGroup.make("controlPlane")
    .add(
      HttpApiEndpoint.post("moveSession", `${root}/move-session`, {
        payload: MoveSessionPayload,
        success: described(HttpApiSchema.NoContent, "Session moved"),
        error: ApiMoveSessionError,
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "experimental.controlPlane.moveSession",
          summary: t("instance.control-plane.experimental_controlPlane_moveSession.summary"),
          description: t("instance.control-plane.experimental_controlPlane_moveSession.description"),
        }),
      ),
    )
    .annotateMerge(OpenApi.annotations({ title: "controlPlane", description: t("instance.control-plane.control-plane_0.description") })),
)

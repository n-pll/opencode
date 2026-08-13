import { ProjectV2 } from "@opencode-ai/core/project"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware, WorkspaceRoutingQuery } from "../middleware/workspace-routing"
import { t } from "@/i18n"

export const GenerateNamePayload = Schema.Struct({
  context: Schema.optional(Schema.String),
})

export const ProjectCopyApi = HttpApi.make("projectCopyName").add(
  HttpApiGroup.make("projectCopyName")
    .add(
      HttpApiEndpoint.post("generateName", "/experimental/project/:projectID/copy/generate-name", {
        params: { projectID: ProjectV2.ID },
        query: WorkspaceRoutingQuery,
        payload: GenerateNamePayload,
        success: Schema.Struct({ name: Schema.String }),
      }).annotateMerge(
        OpenApi.annotations({
          identifier: "experimental.projectCopy.generateName",
          summary: t("instance.project-copy.experimental_projectCopy_generateName.summary"),
          description: t("instance.project-copy.experimental_projectCopy_generateName.description"),
        }),
      ),
    )
    .annotateMerge(OpenApi.annotations({ title: "projectCopy", description: t("instance.project-copy.project-copy_0.description") }))
    .middleware(InstanceContextMiddleware)
    .middleware(WorkspaceRoutingMiddleware)
    .middleware(Authorization),
)

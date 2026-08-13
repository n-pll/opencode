import { Question } from "@/question"
import { QuestionID } from "@/question/schema"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { QuestionNotFoundError } from "../errors"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import { WorkspaceRoutingMiddleware, WorkspaceRoutingQuery } from "../middleware/workspace-routing"
import { described } from "./metadata"
import { t } from "@/i18n"

const root = "/question"
const ReplyPayload = Schema.Struct({
  answers: Schema.Array(Question.Answer).annotate({
    description: t("instance.question.question_0.description"),
  }),
})

export const QuestionApi = HttpApi.make("question")
  .add(
    HttpApiGroup.make("question")
      .add(
        HttpApiEndpoint.get("list", root, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(Question.Request), "List of pending questions"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "question.list",
            summary: t("instance.question.question_list.summary"),
            description: t("instance.question.question_list.description"),
          }),
        ),
        HttpApiEndpoint.post("reply", `${root}/:requestID/reply`, {
          params: { requestID: QuestionID },
          query: WorkspaceRoutingQuery,
          payload: ReplyPayload,
          success: described(Schema.Boolean, "Question answered successfully"),
          error: [HttpApiError.BadRequest, QuestionNotFoundError],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "question.reply",
            summary: t("instance.question.question_reply.summary"),
            description: t("instance.question.question_reply.description"),
          }),
        ),
        HttpApiEndpoint.post("reject", `${root}/:requestID/reject`, {
          params: { requestID: QuestionID },
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Question rejected successfully"),
          error: [HttpApiError.BadRequest, QuestionNotFoundError],
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "question.reject",
            summary: t("instance.question.question_reject.summary"),
            description: t("instance.question.question_reject.description"),
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "question",
          description: t("instance.question.question_1.description"),
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode HttpApi",
      version: "0.0.1",
      description: t("instance.question.question_2.description"),
    }),
  )

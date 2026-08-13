import { Question } from "@opencode-ai/schema/question"
import { Location } from "@opencode-ai/schema/location"
import { Session } from "@opencode-ai/schema/session"
import { Context, Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema, OpenApi } from "effect/unstable/httpapi"
import { QuestionNotFoundError, SessionNotFoundError } from "../errors"
import { LocationQuery, locationQueryOpenApi } from "./location"
import { t } from "../i18n"

export const makeQuestionGroup = <
  LocationId extends HttpApiMiddleware.AnyId,
  LocationService,
  SessionLocationId extends HttpApiMiddleware.AnyId,
  SessionLocationService,
>(
  locationMiddleware: Context.Key<LocationId, LocationService>,
  sessionLocationMiddleware: Context.Key<SessionLocationId, SessionLocationService>,
) =>
  HttpApiGroup.make("server.question")
    .add(
      HttpApiEndpoint.get("question.request.list", "/api/question/request", {
        query: LocationQuery,
        success: Location.response(Schema.Array(Question.Request)),
      })
        .annotateMerge(locationQueryOpenApi)
        .annotateMerge(
          OpenApi.annotations({
            identifier: "v2.question.request.list",
            summary: t("protocol.question.question_request_list.summary"),
            description: t("protocol.question.question_request_list.description"),
          }),
        ),
    )
    .annotateMerge(OpenApi.annotations({ title: "questions", description: t("protocol.question.questions.description") }))
    // Effect applies group middleware only to endpoints already added; session endpoints use session placement below.
    .middleware(locationMiddleware)
    .add(
      HttpApiEndpoint.get("session.question.list", "/api/session/:sessionID/question", {
        params: { sessionID: Session.ID },
        success: Schema.Struct({ data: Schema.Array(Question.Request) }),
        error: SessionNotFoundError,
      })
        .middleware(sessionLocationMiddleware)
        .annotateMerge(
          OpenApi.annotations({
            identifier: "v2.session.question.list",
            summary: t("protocol.question.session_question_list.summary"),
            description: t("protocol.question.session_question_list.description"),
          }),
        ),
    )
    .add(
      HttpApiEndpoint.post("session.question.reply", "/api/session/:sessionID/question/:requestID/reply", {
        params: { sessionID: Session.ID, requestID: Question.ID },
        payload: Question.Reply,
        success: HttpApiSchema.NoContent,
        error: [SessionNotFoundError, QuestionNotFoundError],
      })
        .middleware(sessionLocationMiddleware)
        .annotateMerge(
          OpenApi.annotations({
            identifier: "v2.session.question.reply",
            summary: t("protocol.question.session_question_reply.summary"),
            description: t("protocol.question.session_question_reply.description"),
          }),
        ),
    )
    .add(
      HttpApiEndpoint.post("session.question.reject", "/api/session/:sessionID/question/:requestID/reject", {
        params: { sessionID: Session.ID, requestID: Question.ID },
        success: HttpApiSchema.NoContent,
        error: [SessionNotFoundError, QuestionNotFoundError],
      })
        .middleware(sessionLocationMiddleware)
        .annotateMerge(
          OpenApi.annotations({
            identifier: "v2.session.question.reject",
            summary: t("protocol.question.session_question_reject.summary"),
            description: t("protocol.question.session_question_reject.description"),
          }),
        ),
    )
    .annotateMerge(
      OpenApi.annotations({ title: "session questions", description: t("protocol.question.session_questions.description") }),
    )

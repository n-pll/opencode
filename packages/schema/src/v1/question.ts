export * as QuestionV1 from "./question"

import { Schema } from "effect"
import { define, inventory } from "../event"
import { ascending } from "../identifier"
import { statics } from "../schema"
import { SessionID } from "../session-id"
import { SessionV1 } from "./session"
import { t } from "../i18n"

export const ID = Schema.String.check(Schema.isStartsWith("que")).pipe(
  Schema.brand("QuestionID"),
  statics((schema) => ({ ascending: (id?: string) => schema.make(id ?? "que_" + ascending()) })),
)

export const Option = Schema.Struct({
  label: Schema.String.annotate({ description: t("schema.question.option.label") }),
  description: Schema.String.annotate({ description: t("schema.question.option.description") }),
}).annotate({ identifier: "QuestionOption" })

const base = {
  question: Schema.String.annotate({ description: t("schema.question.info.question") }),
  header: Schema.String.annotate({ description: t("schema.question.info.header") }),
  options: Schema.Array(Option).annotate({ description: t("schema.question.info.options") }),
  multiple: Schema.optional(Schema.Boolean).annotate({ description: t("schema.question.info.multiple") }),
}

export const Info = Schema.Struct({
  ...base,
  custom: Schema.optional(Schema.Boolean).annotate({ description: t("schema.question.info.custom") }),
}).annotate({ identifier: "QuestionInfo" })
export const Prompt = Schema.Struct(base).annotate({ identifier: "QuestionPrompt" })
export const Tool = Schema.Struct({ messageID: SessionV1.MessageID, callID: Schema.String }).annotate({
  identifier: "QuestionTool",
})
export const Request = Schema.Struct({
  id: ID,
  sessionID: SessionID,
  questions: Schema.Array(Info).annotate({ description: t("schema.question.info.questions") }),
  tool: Schema.optional(Tool),
}).annotate({ identifier: "QuestionRequest" })
export const Answer = Schema.Array(Schema.String).annotate({ identifier: "QuestionAnswer" })
export const Reply = Schema.Struct({
  answers: Schema.Array(Answer).annotate({
    description: t("schema.question.info.answers"),
  }),
}).annotate({ identifier: "QuestionReply" })
export const Replied = Schema.Struct({
  sessionID: SessionID,
  requestID: ID,
  answers: Schema.Array(Answer),
}).annotate({
  identifier: "QuestionReplied",
})
export const Rejected = Schema.Struct({ sessionID: SessionID, requestID: ID }).annotate({
  identifier: "QuestionRejected",
})

const Asked = define({ type: "question.asked", schema: Request.fields })
const RepliedEvent = define({ type: "question.replied", schema: Replied.fields })
const RejectedEvent = define({ type: "question.rejected", schema: Rejected.fields })
export const Event = {
  Asked,
  Replied: RepliedEvent,
  Rejected: RejectedEvent,
  Definitions: inventory(Asked, RepliedEvent, RejectedEvent),
}

export * as SessionTodo from "./session-todo"

import { Schema } from "effect"
import { define, inventory } from "./event"
import { SessionID } from "./session-id"
import { t } from "./i18n"

export const Info = Schema.Struct({
  content: Schema.String.annotate({ description: t("schema.session_todo.content") }),
  status: Schema.String.annotate({
    description: t("schema.session_todo.status"),
  }),
  priority: Schema.String.annotate({
    description: t("schema.session_todo.priority"),
  }),
}).annotate({ identifier: "Todo" })
export interface Info extends Schema.Schema.Type<typeof Info> {}

const Updated = define({
  type: "todo.updated",
  schema: {
    sessionID: SessionID,
    todos: Schema.Array(Info),
  },
})
export const Event = { Updated, Definitions: inventory(Updated) }

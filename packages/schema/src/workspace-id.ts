import { t } from "./i18n"
import { Schema } from "effect"
import { ascending } from "./identifier"
import { statics } from "./schema"

export const WorkspaceID = Schema.String.check(Schema.isStartsWith("wrk")).pipe(
  Schema.brand("WorkspaceV2.ID"),
  statics((schema) => {
    const create = () => schema.make("wrk_" + ascending())
    return {
      ascending: (id?: string) => {
        if (!id) return create()
        if (!id.startsWith("wrk")) throw new Error(t("schema.workspace_id.id-does-not-start-with-wrk", { id: id }))
        return schema.make(id)
      },
      create,
    }
  }),
)
export type WorkspaceID = typeof WorkspaceID.Type

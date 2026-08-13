export * as ConfigSkillsV1 from "./skills"

import { Schema } from "effect"
import { t } from "../../i18n"

export const Info = Schema.Struct({
  paths: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: t("core.config.additional_paths_to_skill_folders"),
  }),
  urls: Schema.optional(Schema.Array(Schema.String)).annotate({
    description: "URLs to fetch skills from (e.g., https://example.com/.well-known/skills/)",
  }),
})
export type Info = Schema.Schema.Type<typeof Info>

import { Command } from "@opencode-ai/schema/command"
import { Location } from "@opencode-ai/schema/location"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { LocationQuery, locationQueryOpenApi } from "./location"
import { t } from "../i18n"

export const CommandGroup = HttpApiGroup.make("server.command")
  .add(
    HttpApiEndpoint.get("command.list", "/api/command", {
      query: LocationQuery,
      success: Location.response(Schema.Array(Command.Info)),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "v2.command.list",
          summary: t("protocol.command.command_list.summary"),
          description: t("protocol.command.command_list.description"),
        }),
      ),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "commands",
      description: t("protocol.command.commands.description"),
    }),
  )

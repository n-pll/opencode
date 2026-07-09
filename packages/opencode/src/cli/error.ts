import { NamedError } from "@opencode-ai/core/util/error"
import { coreTranslator } from "@opencode-ai/core/i18n"
import { cliLocale } from "@/i18n"
import { errorFormat } from "@/util/error"
import { isRecord } from "@/util/record"

type ConfigIssue = { message: string; path: string[] }

// Reuse the CLI i18n locale snapshot (resolved once at @/i18n module load from
// OPENCODE_LOCALE/LANG/config peek) so error rendering stays in sync with the
// rest of the CLI surface.
const t = coreTranslator(cliLocale)

function isTaggedError(error: unknown, tag: string): error is Record<string, unknown> {
  return isRecord(error) && error._tag === tag
}

function configData(input: unknown, tag: string): Record<string, unknown> | undefined {
  if (!isRecord(input)) return undefined
  if (input.name === tag && isRecord(input.data)) return input.data
  if (input._tag === tag) return input
  return undefined
}

function stringField(input: Record<string, unknown>, key: string): string | undefined {
  return typeof input[key] === "string" ? input[key] : undefined
}

function configIssues(input: Record<string, unknown>): ConfigIssue[] {
  return Array.isArray(input.issues)
    ? input.issues.filter((issue): issue is ConfigIssue => {
        if (!isRecord(issue)) return false
        return (
          typeof issue.message === "string" &&
          Array.isArray(issue.path) &&
          issue.path.every((x) => typeof x === "string")
        )
      })
    : []
}

export function FormatError(input: unknown): string | undefined {
  if (input instanceof Error && isRecord(input.cause) && "body" in input.cause) {
    const formatted = FormatError(input.cause.body)
    if (formatted) return formatted
  }

  // CliError: domain failure surfaced from an effectCmd handler via fail("...")
  if (isTaggedError(input, "CliError")) {
    if (typeof input.exitCode === "number") process.exitCode = input.exitCode
    return stringField(input, "message") ?? ""
  }

  // MCPFailed: { name: string }
  if (NamedError.hasName(input, "MCPFailed")) {
    const data = isRecord(input) && isRecord(input.data) ? stringField(input.data, "name") : undefined
    return t("core.error.mcpFailed", { name: data ?? "" })
  }

  // AccountServiceError, AccountTransportError: TaggedErrorClass
  if (isTaggedError(input, "AccountServiceError") || isTaggedError(input, "AccountTransportError")) {
    return stringField(input, "message") ?? ""
  }

  // ProviderModelNotFoundError: { providerID: string, modelID: string, suggestions?: string[] }
  const providerModelNotFound = configData(input, "ProviderModelNotFoundError")
  if (providerModelNotFound) {
    const suggestions = Array.isArray(providerModelNotFound.suggestions)
      ? providerModelNotFound.suggestions.filter((x) => typeof x === "string")
      : []
    return [
      t("core.error.modelNotFound", {
        providerID: stringField(providerModelNotFound, "providerID") ?? "",
        modelID: stringField(providerModelNotFound, "modelID") ?? "",
      }),
      ...(suggestions.length ? [t("core.error.modelNotFound.suggest", { suggestions: suggestions.join(", ") })] : []),
      t("core.error.modelNotFound.tryModels"),
      t("core.error.modelNotFound.checkConfig"),
    ].join("\n")
  }

  // ProviderInitError: { providerID: string }
  const providerInit = configData(input, "ProviderInitError")
  if (providerInit) {
    return t("core.error.providerInit", { providerID: stringField(providerInit, "providerID") ?? "" })
  }

  // ConfigJsonError: { path: string, message?: string }
  const configJson = configData(input, "ConfigJsonError")
  if (configJson) {
    const message = stringField(configJson, "message")
    return message
      ? t("core.error.configJson.withMessage", { path: stringField(configJson, "path") ?? "", message })
      : t("core.error.configJson", { path: stringField(configJson, "path") ?? "" })
  }

  // ConfigDirectoryTypoError: { dir: string, path: string, suggestion: string }
  const configDirectoryTypo = configData(input, "ConfigDirectoryTypoError")
  if (configDirectoryTypo) {
    return t("core.error.configDirectoryTypo", {
      dir: stringField(configDirectoryTypo, "dir") ?? "",
      path: stringField(configDirectoryTypo, "path") ?? "",
      suggestion: stringField(configDirectoryTypo, "suggestion") ?? "",
    })
  }

  // ConfigFrontmatterError: { message: string }
  const configFrontmatter = configData(input, "ConfigFrontmatterError")
  if (configFrontmatter) {
    return stringField(configFrontmatter, "message") ?? ""
  }

  // ConfigRemoteAuthError: { url: string, remote: string }
  const remoteAuth = configData(input, "ConfigRemoteAuthError")
  if (remoteAuth) {
    const url = stringField(remoteAuth, "url")
    const remote = stringField(remoteAuth, "remote")
    return [
      remote
        ? t("core.error.remoteAuth.failedFrom", { remote })
        : t("core.error.remoteAuth.failed"),
      t("core.error.remoteAuth.explanation"),
      ...(url ? [t("core.error.remoteAuth.relogin", { url })] : []),
    ].join("\n")
  }

  // ConfigInvalidError: { path?: string, message?: string, issues?: Array<{ message: string, path: string[] }> }
  const configInvalid = configData(input, "ConfigInvalidError")
  if (configInvalid) {
    const path = stringField(configInvalid, "path")
    const message = stringField(configInvalid, "message")
    const issues = configIssues(configInvalid)
    const atPath = path && path !== "config"
    return [
      message
        ? atPath
          ? t("core.error.configInvalid.atWithMessage", { path, message })
          : t("core.error.configInvalid.withMessage", { message })
        : atPath
          ? t("core.error.configInvalid.at", { path })
          : t("core.error.configInvalid"),
      ...issues.map((issue) => "↳ " + issue.message + " " + issue.path.join(".")),
    ].join("\n")
  }

  // UICancelledError: user cancelled an interactive CLI prompt
  if (isTaggedError(input, "UICancelledError") || NamedError.hasName(input, "UICancelledError")) {
    return ""
  }
  return undefined
}

export function FormatUnknownError(input: unknown): string {
  return errorFormat(input)
}

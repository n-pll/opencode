export const urlProperties = new Set([
  "href",
  "origin",
  "protocol",
  "username",
  "password",
  "host",
  "hostname",
  "port",
  "pathname",
  "search",
  "hash",
])

export const urlWritableProperties = new Set([
  "href",
  "protocol",
  "username",
  "password",
  "host",
  "hostname",
  "port",
  "pathname",
  "search",
  "hash",
])

export const urlMethods = new Set(["toString", "toJSON"])
export const urlStatics = new Set(["canParse", "parse"])
export const urlSearchParamsMethods = new Set([
  "append",
  "delete",
  "get",
  "getAll",
  "has",
  "set",
  "sort",
  "forEach",
  "keys",
  "values",
  "entries",
  "toString",
])

export const uriArgument = (value: unknown, label: string): string => coerceToString(boundedData(value, label))

export const invokeUriFunction = (ref: UriFunction, args: Array<unknown>, node: AstNode): string => {
  const value = uriArgument(args[0], `${ref.name} input`)
  try {
    switch (ref.name) {
      case "encodeURI":
        return encodeURI(value)
      case "encodeURIComponent":
        return encodeURIComponent(value)
      case "decodeURI":
        return decodeURI(value)
      case "decodeURIComponent":
        return decodeURIComponent(value)
    }
  } catch (error) {
    const name = ref.name
    const message = error instanceof Error ? error.message : String(error)
    throw new InterpreterRuntimeError(
      t("codemode.url.0", { name, message }),
      node,
    ).as("URIError")
  }
}

export const urlArgument = (value: unknown, label: string): string =>
  value instanceof SandboxURL ? value.url.href : uriArgument(value, label)

export const invokeURLStatic = (name: string, args: Array<unknown>, node: AstNode): unknown => {
  if (!urlStatics.has(name)) throw new InterpreterRuntimeError(t("codemode.url.1", { name }), node)
  if (args.length === 0) throw new InterpreterRuntimeError(t("codemode.url.2", { name }), node).as("TypeError")
  const input = urlArgument(args[0], `URL.${name} input`)
  const base = args[1] === undefined ? undefined : urlArgument(args[1], `URL.${name} base`)
  try {
    const url = new URL(input, base)
    return name === "canParse" ? true : new SandboxURL(url)
  } catch {
    return name === "canParse" ? false : null
  }
}

export const invokeURLMethod = (value: SandboxURL, name: string, node: AstNode): string => {
  if (name === "toString" || name === "toJSON") return value.url.href
  throw new InterpreterRuntimeError(t("codemode.url.3", { name }), node)
}
import { type AstNode, InterpreterRuntimeError, UriFunction } from "../interpreter/model.js"
import { SandboxURL } from "../values.js"
import { boundedData, coerceToString } from "./value.js"
import { t } from "../i18n"

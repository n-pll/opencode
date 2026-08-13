export const regexpMethods = new Set(["test", "exec", "toString"])

export const regexpProperties = new Set([
  "source",
  "flags",
  "lastIndex",
  "global",
  "ignoreCase",
  "multiline",
  "sticky",
  "unicode",
  "dotAll",
])

export const regexFailureReason = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).replace(/^Invalid regular expression:\s*/i, "")

export const escapeRegexHint =
  'To match special characters like ( ) [ ] { } + * ? . literally, escape them with a backslash (e.g. "\\\\(") or test for them with String.includes instead.'

export const toHostRegex = (arg: unknown, method: string, node: AstNode, extraFlags = ""): RegExp => {
  if (arg instanceof SandboxRegExp) return arg.regex
  if (typeof arg === "string") {
    try {
      return new RegExp(arg, extraFlags)
    } catch (error) {
      const received = JSON.stringify(arg)
      const failureReason = regexFailureReason(error)
      throw new InterpreterRuntimeError(
        t("codemode.regexp.0", { method, arg: received, reason: failureReason, hint: escapeRegexHint }),
        node,
      ).as("SyntaxError")
    }
  }
  const argType = arg === null ? "null" : typeof arg
  throw new InterpreterRuntimeError(
    t("codemode.regexp.1", { method, arg: argType }),
    node,
  )
}

export const matchToValue = (match: RegExpMatchArray): Array<unknown> => {
  const result: Array<unknown> = Array.from(match, (group) => group)
  if (match.index !== undefined) (result as Record<string, unknown> & Array<unknown>).index = match.index
  if (match.groups) {
    const groups: SafeObject = Object.create(null) as SafeObject
    for (const [key, group] of Object.entries(match.groups)) {
      if (!isBlockedMember(key)) groups[key] = group
    }
    ;(result as Record<string, unknown> & Array<unknown>).groups = groups
  }
  return result
}

export const invokeRegExpMethod = (
  value: SandboxRegExp,
  name: string,
  args: Array<unknown>,
  node: AstNode,
): unknown => {
  switch (name) {
    case "test":
      return value.regex.test(coerceToString(args[0]))
    case "exec": {
      const matched = value.regex.exec(coerceToString(args[0]))
      return matched === null ? null : matchToValue(matched)
    }
    case "toString":
      return coerceToString(value)
    default:
      throw new InterpreterRuntimeError(t("codemode.regexp.2", { name }), node)
  }
}
import { type AstNode, InterpreterRuntimeError } from "../interpreter/model.js"
import { isBlockedMember, type SafeObject } from "../tool-runtime.js"
import { SandboxRegExp } from "../values.js"
import { coerceToString } from "./value.js"
import { t } from "../i18n"

import { type AstNode, InterpreterRuntimeError } from "../interpreter/model.js"
import { isBlockedMember } from "../tool-runtime.js"
import { isSandboxValue, SandboxMap, SandboxURLSearchParams } from "../values.js"
import { boundedData, coerceToString } from "./value.js"
import { t } from "../i18n"

export const objectStatics = new Set(["keys", "values", "entries", "hasOwn", "assign", "fromEntries"])

export const invokeObjectMethod = (name: string, args: Array<unknown>, node: AstNode): unknown => {
  if (!objectStatics.has(name)) throw new InterpreterRuntimeError(t("codemode.object.0", { name }), node)
  const requireObject = (): Record<string, unknown> => {
    const value = boundedData(args[0], `Object.${name} input`)
    if (isSandboxValue(value)) return {}
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new InterpreterRuntimeError(t("codemode.object.1", { name }), node)
    }
    return value as Record<string, unknown>
  }
  const guardedSet = (out: Record<string, unknown>, key: string, item: unknown): void => {
    if (isBlockedMember(key)) throw new InterpreterRuntimeError(t("codemode.runtime.34", { key }), node)
    out[key] = item
  }
  switch (name) {
    case "keys": {
      const value = boundedData(args[0], "Object.keys input")
      if (isSandboxValue(value)) return []
      if (Array.isArray(value)) return Object.keys(value)
      if (value === null || typeof value !== "object") {
        throw new InterpreterRuntimeError(t("codemode.object.3"), node)
      }
      return Object.keys(value)
    }
    case "values":
      return Object.values(requireObject())
    case "entries":
      return Object.entries(requireObject()).map(([key, item]) => [key, item])
    case "hasOwn":
      return Object.hasOwn(requireObject(), String(args[1]))
    case "assign": {
      const out: Record<string, unknown> = Object.create(null)
      for (const source of args) {
        if (source === null || source === undefined) continue
        const value = boundedData(source, "Object.assign input")
        if (isSandboxValue(value)) continue
        if (value === null || typeof value !== "object" || Array.isArray(value)) {
          throw new InterpreterRuntimeError(t("codemode.object.4"), node)
        }
        for (const [key, item] of Object.entries(value)) guardedSet(out, key, item)
      }
      return out
    }
    case "fromEntries": {
      if (args[0] instanceof SandboxMap) {
        const out: Record<string, unknown> = Object.create(null)
        for (const [key, item] of args[0].map.entries()) guardedSet(out, coerceToString(key), item)
        return out
      }
      if (args[0] instanceof SandboxURLSearchParams) {
        const out: Record<string, unknown> = Object.create(null)
        for (const [key, value] of args[0].params.entries()) guardedSet(out, key, value)
        return out
      }
      const pairs = boundedData(args[0], "Object.fromEntries input")
      if (!Array.isArray(pairs)) {
        throw new InterpreterRuntimeError(t("codemode.object.5"), node)
      }
      const out: Record<string, unknown> = Object.create(null)
      for (const pair of pairs) {
        if (!Array.isArray(pair)) {
          throw new InterpreterRuntimeError(t("codemode.object.6"), node)
        }
        guardedSet(out, String(pair[0]), pair[1])
      }
      return out
    }
  }
  throw new InterpreterRuntimeError(t("codemode.object.0", { name }), node)
}

import { describe, expect, test } from "bun:test"
import { parseForkTranslationArgs, targetFiles } from "./translate-fork"

describe("translate fork", () => {
  test("parses the zh locale with the public model defaults", () => {
    expect(parseForkTranslationArgs(["zh"])).toEqual({
      target: "zh",
      concurrency: 1,
      model: "opencode/gpt-5.5",
      variant: "xhigh",
      dryRun: false,
      check: false,
      help: false,
    })
  })

  test("rejects unsupported targets and invalid concurrency", () => {
    expect(() => parseForkTranslationArgs(["en"])).toThrow("Unknown locale")
    expect(() => parseForkTranslationArgs(["fr"])).toThrow("Unknown locale")
    expect(() => parseForkTranslationArgs(["zh", "de"])).toThrow("one locale")
    expect(() => parseForkTranslationArgs(["zh", "--concurrency", "0"])).toThrow("positive integer")
  })

  test("parses fresh-process parity checks without requesting translation", () => {
    expect(parseForkTranslationArgs(["zh", "--check"]).check).toBe(true)
    expect(parseForkTranslationArgs(["zh", "--dry-run"]).dryRun).toBe(true)
  })

  test("targets the fork CLI/TUI/core dictionary domains only", () => {
    expect(targetFiles("zh")).toEqual([
      "packages/core/src/i18n/zh.ts",
      "packages/opencode/src/i18n/zh.ts",
      "packages/tui/src/i18n/zh.ts",
    ])
  })
})

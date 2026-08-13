import { describe, expect, test } from "bun:test"
import { dict as en } from "../src/i18n/en"
import { dict as zh } from "../src/i18n/zh"

// A value is "translatable" when, after stripping {{param}} placeholders, it
// contains a latin letter and is not a URL. Single technical tokens and brand
// names (e.g. "Warp", "API key", "tokens") are legitimately kept verbatim
// across locales; the test asserts they remain a small, reviewed set.
const stripped = (value: string) => value.replace(/{{[^}]+}}/g, "")
const isUrl = (value: string) => /^https?:\/\//i.test(value.trim())
// SVG path data and code identifiers are not translatable prose; exclude them
// from the verbatim check so technical values kept as-is don't count.
const isTranslatable = (value: string) =>
  /[a-z]/i.test(stripped(value)) &&
  !isUrl(value) &&
  !/^M\d|^\d[\d ,-]*$|^from\w*\(/.test(stripped(value))

// Aligns with the upstream translate-app findDrift placeholder check: the
// sorted multiset of {{tokens}} must match exactly, so a translation can never
// drop or rename a placeholder.
const tokens = (value: string) =>
  Array.from(value.matchAll(/{{\s*([^}]+?)\s*}}/g), (match) => match[1] ?? "").sort()

describe("i18n parity", () => {
  test("zh translates every translatable en key", () => {
    const untranslated: string[] = []
    for (const key of Object.keys(en)) {
      const zhValue = zh[key as keyof typeof zh]
      expect(zhValue).toBeDefined()
      if (isTranslatable(en[key]) && zhValue === en[key]) untranslated.push(key)
    }
    // Allow a small number of intentionally-verbatim technical tokens.
    expect(untranslated.length <= 15).toBe(true)
    if (untranslated.length > 0) console.log("verbatim in zh:", untranslated.join(", "))
  })

  test("zh preserves the {{tokens}} of every en key", () => {
    const mismatched: string[] = []
    for (const key of Object.keys(en)) {
      const zhValue = zh[key as keyof typeof zh]
      if (zhValue !== undefined && tokens(en[key]).join() !== tokens(zhValue).join()) mismatched.push(key)
    }
    expect(mismatched).toEqual([])
  })

  test("zh does not define keys absent from en", () => {
    const enKeys = new Set(Object.keys(en))
    for (const key of Object.keys(zh)) {
      expect(enKeys.has(key)).toBe(true)
    }
  })
})

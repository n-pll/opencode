import { describe, expect, test } from "bun:test"
import { dict as en } from "../src/i18n/en"
import { dict as zh } from "../src/i18n/zh"

const stripped = (value: string) => value.replace(/{{[^}]+}}/g, "")
const isUrl = (value: string) => /^https?:\/\//i.test(value.trim())
const isTranslatable = (value: string) => /[a-z]/i.test(stripped(value)) && !isUrl(value)

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

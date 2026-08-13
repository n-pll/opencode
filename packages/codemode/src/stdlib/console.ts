import { t } from "../i18n"
export const consoleMethods = new Set(["log", "info", "debug", "warn", "error", "dir", "table"])

/** Console formatting recursion ceiling; deeper values render as "...". */
export const MAX_CONSOLE_DEPTH = 32

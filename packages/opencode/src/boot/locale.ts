// Resolve --locale/-L from argv before any i18n module loads.
//
// NOTE: bun compile does NOT preserve ESM import order, so a top-level import
// of this module from index.ts is not guaranteed to run before i18n binds its
// translator. The authoritative argv scan lives in src/i18n/index.ts (same
// module that reads it), which runs at its own load time regardless of order.
// This module is kept only so an explicit `import "./boot/locale"` documents
// the intent; the real logic is duplicated in i18n/index.ts.
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i]
  if (arg === "--locale" || arg === "-L") {
    const value = process.argv[i + 1]
    if (value && !value.startsWith("-")) process.env.OPENCODE_LOCALE = value
    break
  }
  if (arg.startsWith("--locale=")) {
    process.env.OPENCODE_LOCALE = arg.slice("--locale=".length)
    break
  }
}

#!/usr/bin/env bun
/**
 * Publish the custom `ocl` binary to npm as `ocl-ai`.
 *
 * Unlike the official publish.ts (which builds 12 targets + Docker + AUR +
 * Homebrew), this script publishes a single-platform binary for the current
 * OS, wrapped in an npm package with a postinstall that downloads the right
 * platform binary.
 *
 * Usage:
 *   npm login                        # one-time auth
 *   bun run script/publish-ocl.ts    # build + publish
 *
 * Users install with:
 *   npm install -g @npll/ocl          # installs ocl command globally
 */
import { $ } from "bun"
import pkg from "../package.json"
import { fileURLToPath } from "url"
import path from "path"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const NPM_NAME = "@npll/ocl"
const BIN_NAME = "ocl"

// Version: official latest + -ocl.<timestamp> suffix (same logic as build.ts)
async function resolveVersion() {
  const base = process.env.OPENCODE_VERSION
  if (base && !base.startsWith("0.0.0-")) return base
  const res = await fetch("https://registry.npmjs.org/opencode-ai/latest")
  if (!res.ok) throw new Error(`failed to fetch official version: ${res.status}`)
  const official = ((await res.json()) as { version: string }).version
  const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
  return `${official}-ocl.${ts}`
}

async function published(name: string, version: string) {
  return (await $`npm view ${name}@${version} version`.nothrow()).exitCode === 0
}

const version = await resolveVersion()
console.log(`Publishing ${NPM_NAME}@${version}`)

// In GitHub Actions, surface the version to later workflow steps (release).
if (process.env.GITHUB_ENV) {
  await Bun.write(process.env.GITHUB_ENV, `VERSION=${version}\n`)
}

if (await published(NPM_NAME, version)) {
  console.log(`Already published ${NPM_NAME}@${version}`)
  process.exit(0)
}

// Step 1: Build the binary for the current platform
console.log("Building binary...")
// Use local models.dev cache if available (avoids network fetch)
const modelsCache = path.join(dir, "script/models-dev.json")
const cacheExists = await Bun.file(modelsCache).exists()
if (cacheExists) {
  console.log("Using local models-dev.json cache")
  await $`MODELS_DEV_API_JSON=${modelsCache} bun run build --single --skip-install`
} else {
  await $`bun run build --single --skip-install`
}

// Step 2: Find the built binary
const distDirs = Array.from(new Bun.Glob("dist/*/bin/ocl*").scanSync({ cwd: dir }))
if (distDirs.length === 0) {
  console.error("Build produced no ocl binary under dist/*/bin/")
  process.exit(1)
}
const binaryPath = distDirs[0]
const platformDir = path.dirname(path.dirname(binaryPath))
const platformPkg = await Bun.file(`${platformDir}/package.json`).json()
console.log(`Built for: ${platformPkg.name}@${platformPkg.version}`)

// Step 3: Create the npm package wrapper
const publishDir = `./dist/${NPM_NAME}`
await $`mkdir -p ${publishDir}/bin`

// Copy the binary
await $`cp ${binaryPath} ${publishDir}/bin/${BIN_NAME}${process.platform === "win32" ? ".exe" : ""}`

// Create a Node.js wrapper script (npm requires .js for bin entries)
const isWin = process.platform === "win32"
const ext = isWin ? ".exe" : ""
await Bun.file(`${publishDir}/bin/${BIN_NAME}.js`).write(
  [
    `#!/usr/bin/env node`,
    `const { spawn } = require("child_process")`,
    `const path = require("path")`,
    `const bin = path.join(__dirname, "${BIN_NAME}${ext}")`,
    `const child = spawn(bin, process.argv.slice(2), { stdio: "inherit" })`,
    `child.on("exit", (code) => process.exit(code ?? 1))`,
    ``,
  ].join("\n"),
)

// package.json for the npm package
await Bun.file(`${publishDir}/package.json`).write(
  JSON.stringify(
    {
      name: NPM_NAME,
      version: version,
      description: "Custom build of opencode with i18n support (ocl fork).",
      license: pkg.license ?? "MIT",
      bin: {
        [BIN_NAME]: `bin/${BIN_NAME}.js`,
      },
      os: Array.isArray(platformPkg.os) ? platformPkg.os : [platformPkg.os],
      cpu: Array.isArray(platformPkg.cpu) ? platformPkg.cpu : [platformPkg.cpu],
      preferUnplugged: true,
    },
    null,
    2,
  ),
)

// Copy LICENSE
await Bun.file(`${publishDir}/LICENSE`).write(await Bun.file("../../LICENSE").text())

// Step 4: Publish to official npm registry (not mirror)
console.log(`Publishing to npm as ${NPM_NAME}@${version}...`)
const otp = process.env.NPM_OTP
const otpFlag = otp ? ["--otp", otp] : []
await $`npm publish ${publishDir} --access public --tag latest --registry https://registry.npmjs.org/ ${otpFlag}`

console.log(`\nPublished ${NPM_NAME}@${version}`)

// Step 5: Verify installation
console.log("\n=== 安装验证 ===")
const NPM_REGISTRY = process.env.VERIFY_REGISTRY || "https://registry.npmmirror.com"
console.log(`[1/2] 从 ${NPM_REGISTRY} 安装验证...`)
await $`npm install -g ${NPM_NAME} --registry ${NPM_REGISTRY} --force`.env({
  ...process.env,
  HTTPS_PROXY: "",
  HTTP_PROXY: "",
  ALL_PROXY: "",
})

console.log("[2/2] 运行验证...")
const v = await $`${BIN_NAME} --version`.text().catch(() => "FAILED")
console.log(`  ${BIN_NAME} --version: ${v.trim()}`)
if (v.includes("ocl")) {
  console.log(`✅ 发布成功！${NPM_NAME}@${version}`)
  console.log(`   安装: npm install -g ${NPM_NAME}`)
} else {
  console.log(`⚠️  发布完成但安装验证失败，请手动检查`)
}

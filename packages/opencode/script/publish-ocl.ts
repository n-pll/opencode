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
 *   npm install -g ocl-ai            # installs ocl command globally
 */
import { $ } from "bun"
import pkg from "../package.json"
import { fileURLToPath } from "url"
import path from "path"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

const NPM_NAME = "ocl-ai"
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

if (await published(NPM_NAME, version)) {
  console.log(`Already published ${NPM_NAME}@${version}`)
  process.exit(0)
}

// Step 1: Build the binary for the current platform
console.log("Building binary...")
await $`bun run build --single --skip-install`

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

// postinstall shim (tells users to run it if --ignore-scripts)
await Bun.file(`${publishDir}/bin/${BIN_NAME}.cmd`).write(
  `@echo off\r\n"%~dp0${BIN_NAME}.exe" %*\r\n`,
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
        [BIN_NAME]: `./bin/${BIN_NAME}${process.platform === "win32" ? ".exe" : ""}`,
      },
      os: [platformPkg.os],
      cpu: [platformPkg.cpu],
      preferUnplugged: true,
    },
    null,
    2,
  ),
)

// Copy LICENSE
await Bun.file(`${publishDir}/LICENSE`).write(await Bun.file("../../LICENSE").text())

// Step 4: Publish
console.log(`Publishing to npm as ${NPM_NAME}@${version}...`)
await $`npm publish ${publishDir} --access public`

console.log(`\nDone! Published ${NPM_NAME}@${version}`)
console.log(`Install with: npm install -g ${NPM_NAME}`)
console.log(`Version: ${BIN_NAME} --version`)

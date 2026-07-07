import { cmd } from "./cmd"
import { ConfigV1 } from "@opencode-ai/core/v1/config/config"
import { effectCmd } from "../effect-cmd"
import { Cause } from "effect"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js"
import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js"
import * as prompts from "@clack/prompts"
import { UI } from "../ui"
import { MCP } from "../../mcp"
import { McpAuth } from "../../mcp/auth"
import { McpOAuthProvider } from "../../mcp/oauth-provider"
import { Config } from "@/config/config"
import { ConfigMCPV1 } from "@opencode-ai/core/v1/config/mcp"
import { InstanceRef } from "@/effect/instance-ref"
import { InstallationVersion } from "@opencode-ai/core/installation/version"
import path from "path"
import { Global } from "@opencode-ai/core/global"
import { modify, applyEdits } from "jsonc-parser"
import { Filesystem } from "@/util/filesystem"
import { Effect } from "effect"
import { t } from "@/i18n"

function getAuthStatusIcon(status: MCP.AuthStatus): string {
  switch (status) {
    case "authenticated":
      return "✓"
    case "expired":
      return "⚠"
    case "not_authenticated":
      return "✗"
  }
}

function getAuthStatusText(status: MCP.AuthStatus): string {
  switch (status) {
    case "authenticated":
      return t("cli.mcp.auth-status.authenticated")
    case "expired":
      return t("cli.mcp.auth-status.expired")
    case "not_authenticated":
      return t("cli.mcp.auth-status.not-authenticated")
  }
}

type McpEntry = NonNullable<ConfigV1.Info["mcp"]>[string]

type McpConfigured = ConfigMCPV1.Info
function isMcpConfigured(config: McpEntry): config is McpConfigured {
  return typeof config === "object" && config !== null && "type" in config
}

type McpRemote = Extract<McpConfigured, { type: "remote" }>
function isMcpRemote(config: McpEntry): config is McpRemote {
  return isMcpConfigured(config) && config.type === "remote"
}

function configuredServers(config: ConfigV1.Info) {
  return Object.entries(config.mcp ?? {}).filter((entry): entry is [string, McpConfigured] => isMcpConfigured(entry[1]))
}

function oauthServers(config: ConfigV1.Info) {
  return configuredServers(config).filter(
    (entry): entry is [string, McpRemote] => isMcpRemote(entry[1]) && entry[1].oauth !== false,
  )
}

function listState() {
  return Effect.gen(function* () {
    const cfg = yield* Config.Service
    const mcp = yield* MCP.Service
    const config = yield* cfg.get()
    const statuses = yield* mcp.status()
    const stored = yield* Effect.all(
      Object.fromEntries(configuredServers(config).map(([name]) => [name, mcp.hasStoredTokens(name)])),
      { concurrency: "unbounded" },
    )
    return { config, statuses, stored }
  })
}

function authState() {
  return Effect.gen(function* () {
    const cfg = yield* Config.Service
    const mcp = yield* MCP.Service
    const config = yield* cfg.get()
    const auth = yield* Effect.all(
      Object.fromEntries(oauthServers(config).map(([name]) => [name, mcp.getAuthStatus(name)])),
      { concurrency: "unbounded" },
    )
    return { config, auth }
  })
}

export const McpCommand = cmd({
  command: "mcp",
  describe: t("cli.mcp.describe"),
  builder: (yargs) =>
    yargs
      .command(McpAddCommand)
      .command(McpListCommand)
      .command(McpAuthCommand)
      .command(McpLogoutCommand)
      .command(McpDebugCommand)
      .demandCommand(),
  async handler() {},
})

export const McpListCommand = effectCmd({
  command: "list",
  aliases: ["ls"],
  describe: t("cli.mcp.list.describe"),
  handler: Effect.fn("Cli.mcp.list")(function* () {
    UI.empty()
    prompts.intro(t("cli.mcp.list.intro"))

    const { config, statuses, stored } = yield* listState()
    const servers = configuredServers(config)

    if (servers.length === 0) {
      prompts.log.warn(t("cli.mcp.list.warn.no-servers"))
      prompts.outro(t("cli.mcp.list.outro.add-hint"))
      return
    }

    for (const [name, serverConfig] of servers) {
      const status = statuses[name]
      const hasOAuth = isMcpRemote(serverConfig) && !!serverConfig.oauth
      const hasStoredTokens = stored[name]

      let statusIcon: string
      let statusText: string
      let hint = ""

      if (!status) {
        statusIcon = "○"
        statusText = t("cli.mcp.status.not-initialized")
      } else if (status.status === "connected") {
        statusIcon = "✓"
        statusText = t("cli.mcp.status.connected")
        if (hasOAuth && hasStoredTokens) {
          hint = t("cli.mcp.status.oauth-hint")
        }
      } else if (status.status === "disabled") {
        statusIcon = "○"
        statusText = t("cli.mcp.status.disabled")
      } else if (status.status === "needs_auth") {
        statusIcon = "⚠"
        statusText = t("cli.mcp.status.needs-auth")
      } else if (status.status === "needs_client_registration") {
        statusIcon = "✗"
        statusText = t("cli.mcp.status.needs-client-registration")
        hint = "\n    " + status.error
      } else {
        statusIcon = "✗"
        statusText = t("cli.mcp.status.failed")
        hint = "\n    " + status.error
      }

      const typeHint = serverConfig.type === "remote" ? serverConfig.url : serverConfig.command.join(" ")
      prompts.log.info(
        `${statusIcon} ${name} ${UI.Style.TEXT_DIM}${statusText}${hint}\n    ${UI.Style.TEXT_DIM}${typeHint}`,
      )
    }

    prompts.outro(t("cli.mcp.list.outro.server-count", { count: servers.length }))
  }),
})

export const McpAuthCommand = effectCmd({
  command: "auth [name]",
  describe: t("cli.mcp.auth.describe"),
  builder: (yargs) =>
    yargs
      .positional("name", {
        describe: t("cli.mcp.auth.positional.name"),
        type: "string",
      })
      .command(McpAuthListCommand),
  handler: Effect.fn("Cli.mcp.auth")(function* (args) {
    UI.empty()
    prompts.intro(t("cli.mcp.auth.intro"))

    const { config, auth } = yield* authState()
    const mcpServers = config.mcp ?? {}
    const servers = oauthServers(config)

    if (servers.length === 0) {
      prompts.log.warn(t("cli.mcp.auth.warn.no-oauth-servers"))
      prompts.log.info(t("cli.mcp.auth.info.remote-hint"))
      prompts.log.info(`
  "mcp": {
    "my-server": {
      "type": "remote",
      "url": "https://example.com/mcp"
    }
  }`)
      prompts.outro(t("cli.mcp.auth.outro.done"))
      return
    }

    let serverName = args.name
    if (!serverName) {
      // Build options with auth status
      const options = servers.map(([name, cfg]) => {
        const authStatus = auth[name]
        const icon = getAuthStatusIcon(authStatus)
        const statusText = getAuthStatusText(authStatus)
        const url = cfg.url
        return {
          label: `${icon} ${name} (${statusText})`,
          value: name,
          hint: url,
        }
      })

      const selected = yield* Effect.promise(() =>
        prompts.select({
          message: t("cli.mcp.auth.prompt.select-server"),
          options,
        }),
      )
      if (prompts.isCancel(selected)) throw new UI.CancelledError()
      serverName = selected
    }

    const serverConfig = mcpServers[serverName]
    if (!serverConfig) {
      prompts.log.error(t("cli.mcp.auth.error.server-not-found", { serverName }))
      prompts.outro(t("cli.mcp.auth.outro.done"))
      return
    }

    if (!isMcpRemote(serverConfig) || serverConfig.oauth === false) {
      prompts.log.error(t("cli.mcp.auth.error.not-oauth-capable", { serverName }))
      prompts.outro(t("cli.mcp.auth.outro.done"))
      return
    }

    // Check if already authenticated
    const authStatus = auth[serverName] ?? (yield* MCP.Service.use((mcp) => mcp.getAuthStatus(serverName)))
    if (authStatus === "authenticated") {
      const confirm = yield* Effect.promise(() =>
        prompts.confirm({
          message: t("cli.mcp.auth.prompt.re-authenticate", { serverName }),
        }),
      )
      if (prompts.isCancel(confirm) || !confirm) {
        prompts.outro(t("cli.mcp.auth.outro.cancelled"))
        return
      }
    } else if (authStatus === "expired") {
      prompts.log.warn(t("cli.mcp.auth.warn.expired", { serverName }))
    }

    const spinner = prompts.spinner()
    spinner.start(t("cli.mcp.auth.spinner.starting-oauth"))

    yield* MCP.Service.use((mcp) =>
      mcp.authenticate(serverName, (url) => {
        spinner.stop(t("cli.mcp.auth.spinner.authorize-browser", { url }))
        prompts.log.info(url)
        spinner.start(t("cli.mcp.auth.spinner.waiting-auth"))
      }),
    ).pipe(
      Effect.tap((status) =>
        Effect.sync(() => {
          if (status.status === "connected") {
            spinner.stop(t("cli.mcp.auth.spinner.success"))
          } else if (status.status === "needs_client_registration") {
            spinner.stop(t("cli.mcp.auth.spinner.failed"), 1)
            prompts.log.error(status.error)
            prompts.log.info(t("cli.mcp.auth.info.add-clientid"))
            prompts.log.info(`
  "mcp": {
    "${serverName}": {
      "type": "remote",
      "url": "${serverConfig.url}",
      "oauth": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret"
      }
    }
  }`)
          } else if (status.status === "failed") {
            spinner.stop(t("cli.mcp.auth.spinner.failed"), 1)
            prompts.log.error(status.error)
          } else {
            spinner.stop(t("cli.mcp.auth.spinner.unexpected-status", { status: status.status }), 1)
          }
        }),
      ),
      Effect.catchCause((cause) =>
        Effect.sync(() => {
          spinner.stop(t("cli.mcp.auth.spinner.failed"), 1)
          const error = Cause.squash(cause)
          prompts.log.error(error instanceof Error ? error.message : String(error))
        }),
      ),
    )

    prompts.outro(t("cli.mcp.auth.outro.done"))
  }),
})

export const McpAuthListCommand = effectCmd({
  command: "list",
  aliases: ["ls"],
  describe: t("cli.mcp.auth.list.describe"),
  handler: Effect.fn("Cli.mcp.auth.list")(function* () {
    UI.empty()
    prompts.intro(t("cli.mcp.auth.list.intro"))

    const { config, auth } = yield* authState()
    const servers = oauthServers(config)

    if (servers.length === 0) {
      prompts.log.warn(t("cli.mcp.auth.warn.no-oauth-servers"))
      prompts.outro(t("cli.mcp.auth.outro.done"))
      return
    }

    for (const [name, serverConfig] of servers) {
      const authStatus = auth[name]
      const icon = getAuthStatusIcon(authStatus)
      const statusText = getAuthStatusText(authStatus)
      const url = serverConfig.url

      prompts.log.info(`${icon} ${name} ${UI.Style.TEXT_DIM}${statusText}\n    ${UI.Style.TEXT_DIM}${url}`)
    }

    prompts.outro(t("cli.mcp.auth.list.outro.oauth-count", { count: servers.length }))
  }),
})

export const McpLogoutCommand = effectCmd({
  command: "logout [name]",
  describe: t("cli.mcp.logout.describe"),
  builder: (yargs) =>
    yargs.positional("name", {
      describe: t("cli.mcp.logout.positional.name"),
      type: "string",
    }),
  handler: Effect.fn("Cli.mcp.logout")(function* (args) {
    UI.empty()
    prompts.intro(t("cli.mcp.logout.intro"))

    const credentials = yield* McpAuth.Service.use((auth) => auth.all())
    const serverNames = Object.keys(credentials)

    if (serverNames.length === 0) {
      prompts.log.warn(t("cli.mcp.logout.warn.no-credentials"))
      prompts.outro(t("cli.mcp.auth.outro.done"))
      return
    }

    let serverName = args.name
    if (!serverName) {
      const selected = yield* Effect.promise(() =>
        prompts.select({
          message: t("cli.mcp.logout.prompt.select-server"),
          options: serverNames.map((name) => {
            const entry = credentials[name]
            const hasTokens = !!entry.tokens
            const hasClient = !!entry.clientInfo
            let hint = ""
            if (hasTokens && hasClient) hint = t("cli.mcp.logout.hint.tokens-client")
            else if (hasTokens) hint = t("cli.mcp.logout.hint.tokens")
            else if (hasClient) hint = t("cli.mcp.logout.hint.client-registration")
            return {
              label: name,
              value: name,
              hint,
            }
          }),
        }),
      )
      if (prompts.isCancel(selected)) throw new UI.CancelledError()
      serverName = selected
    }

    if (!credentials[serverName]) {
      prompts.log.error(t("cli.mcp.logout.error.no-credentials-for", { serverName }))
      prompts.outro(t("cli.mcp.auth.outro.done"))
      return
    }

    yield* MCP.Service.use((mcp) => mcp.removeAuth(serverName))
    prompts.log.success(t("cli.mcp.logout.success.removed", { serverName }))
    prompts.outro(t("cli.mcp.auth.outro.done"))
  }),
})

async function resolveConfigPath(baseDir: string, global = false) {
  // Check for existing config files (prefer .jsonc over .json, check .opencode/ subdirectory too)
  const candidates = [path.join(baseDir, "opencode.json"), path.join(baseDir, "opencode.jsonc")]

  if (!global) {
    candidates.push(path.join(baseDir, ".opencode", "opencode.json"), path.join(baseDir, ".opencode", "opencode.jsonc"))
  }

  for (const candidate of candidates) {
    if (await Filesystem.exists(candidate)) {
      return candidate
    }
  }

  // Default to opencode.json if none exist
  return candidates[0]
}

async function addMcpToConfig(name: string, mcpConfig: ConfigMCPV1.Info, configPath: string) {
  let text = "{}"
  if (await Filesystem.exists(configPath)) {
    text = await Filesystem.readText(configPath)
  }

  // Use jsonc-parser to modify while preserving comments
  const edits = modify(text, ["mcp", name], mcpConfig, {
    formattingOptions: { tabSize: 2, insertSpaces: true },
  })
  const result = applyEdits(text, edits)

  await Filesystem.write(configPath, result)

  return configPath
}

export const McpAddCommand = effectCmd({
  command: "add [name]",
  describe: t("cli.mcp.add.describe"),
  builder: (yargs) =>
    yargs
      .positional("name", {
        describe: t("cli.mcp.add.positional.name"),
        type: "string",
      })
      .option("url", {
        describe: t("cli.mcp.add.option.url"),
        type: "string",
      })
      .option("env", {
        describe: t("cli.mcp.add.option.env"),
        type: "string",
        array: true,
      })
      .option("header", {
        describe: t("cli.mcp.add.option.header"),
        type: "string",
        array: true,
      }),
  handler: Effect.fn("Cli.mcp.add")(function* (args) {
    const maybeCtx = yield* InstanceRef
    if (!maybeCtx) return yield* Effect.die("InstanceRef not provided")
    const ctx = maybeCtx
    yield* Effect.promise(async () => {
      const command = args["--"] ?? []
      if (!args.name && (args.url || args.env?.length || args.header?.length || command.length)) {
        throw new Error(t("cli.mcp.error.server-name-required"))
      }
      if (args.name) {
        if (!!args.url === !!command.length) {
          throw new Error(t("cli.mcp.error.url-or-command"))
        }
        if (args.url && !URL.canParse(args.url)) {
          throw new Error(t("cli.mcp.error.invalid-url", { url: args.url }))
        }
        if (args.url && args.env?.length) {
          throw new Error(t("cli.mcp.error.env-local-only"))
        }
        if (command.length && args.header?.length) {
          throw new Error(t("cli.mcp.error.header-remote-only"))
        }

        const entries = (values: string[], kind: string) =>
          Object.fromEntries(
            values.map((entry) => {
              const index = entry.indexOf("=")
              if (index < 1) throw new Error(t("cli.mcp.error.invalid-entry", { kind, entry }))
              return [entry.slice(0, index), entry.slice(index + 1)]
            }),
          )
        const environment = entries(args.env ?? [], "environment variable")
        const headers = entries(args.header ?? [], "HTTP header")
        const mcpConfig: ConfigMCPV1.Info = args.url
          ? {
              type: "remote",
              url: args.url,
              ...(Object.keys(headers).length ? { headers } : {}),
            }
          : {
              type: "local",
              command,
              ...(Object.keys(environment).length ? { environment } : {}),
            }

        const configPath = await resolveConfigPath(Global.Path.config, true)
        await addMcpToConfig(args.name, mcpConfig, configPath)
        prompts.log.success(t("cli.mcp.add.success.added", { name: args.name, configPath }))
        return
      }

      UI.empty()
      prompts.intro(t("cli.mcp.add.intro"))

      const project = ctx.project

      // Resolve config paths eagerly for hints
      const [projectConfigPath, globalConfigPath] = await Promise.all([
        resolveConfigPath(ctx.worktree),
        resolveConfigPath(Global.Path.config, true),
      ])

      // Determine scope
      let configPath = globalConfigPath
      if (project.vcs === "git") {
        const scopeResult = await prompts.select({
          message: t("cli.mcp.add.prompt.location"),
          options: [
            {
              label: t("cli.mcp.add.option.location.current-project"),
              value: projectConfigPath,
              hint: projectConfigPath,
            },
            {
              label: t("cli.mcp.add.option.location.global"),
              value: globalConfigPath,
              hint: globalConfigPath,
            },
          ],
        })
        if (prompts.isCancel(scopeResult)) throw new UI.CancelledError()
        configPath = scopeResult
      }

      const name = await prompts.text({
        message: t("cli.mcp.add.prompt.server-name"),
        validate: (x) => (x && x.length > 0 ? undefined : t("cli.mcp.add.validate.required")),
      })
      if (prompts.isCancel(name)) throw new UI.CancelledError()

      const type = await prompts.select({
        message: t("cli.mcp.add.prompt.server-type"),
        options: [
          {
            label: t("cli.mcp.add.option.type.local"),
            value: "local",
            hint: t("cli.mcp.add.option.type.local-hint"),
          },
          {
            label: t("cli.mcp.add.option.type.remote"),
            value: "remote",
            hint: t("cli.mcp.add.option.type.remote-hint"),
          },
        ],
      })
      if (prompts.isCancel(type)) throw new UI.CancelledError()

      if (type === "local") {
        const command = await prompts.text({
          message: t("cli.mcp.add.prompt.command"),
          placeholder: t("cli.mcp.add.prompt.command-placeholder"),
          validate: (x) => (x && x.length > 0 ? undefined : t("cli.mcp.add.validate.required")),
        })
        if (prompts.isCancel(command)) throw new UI.CancelledError()

        const mcpConfig: ConfigMCPV1.Info = {
          type: "local",
          command: command.split(" "),
        }

        await addMcpToConfig(name, mcpConfig, configPath)
        prompts.log.success(t("cli.mcp.add.success.added", { name, configPath }))
        prompts.outro(t("cli.mcp.add.outro.success"))
        return
      }

      if (type === "remote") {
        const url = await prompts.text({
          message: t("cli.mcp.add.prompt.url"),
          placeholder: t("cli.mcp.add.prompt.url-placeholder"),
          validate: (x) => {
            if (!x) return t("cli.mcp.add.validate.required")
            if (x.length === 0) return t("cli.mcp.add.validate.required")
            const isValid = URL.canParse(x)
            return isValid ? undefined : t("cli.mcp.add.validate.invalid-url")
          },
        })
        if (prompts.isCancel(url)) throw new UI.CancelledError()

        const useOAuth = await prompts.confirm({
          message: t("cli.mcp.add.prompt.require-oauth"),
          initialValue: false,
        })
        if (prompts.isCancel(useOAuth)) throw new UI.CancelledError()

        let mcpConfig: ConfigMCPV1.Info

        if (useOAuth) {
          const hasClientId = await prompts.confirm({
            message: t("cli.mcp.add.prompt.has-client-id"),
            initialValue: false,
          })
          if (prompts.isCancel(hasClientId)) throw new UI.CancelledError()

          if (hasClientId) {
            const clientId = await prompts.text({
              message: t("cli.mcp.add.prompt.enter-client-id"),
              validate: (x) => (x && x.length > 0 ? undefined : t("cli.mcp.add.validate.required")),
            })
            if (prompts.isCancel(clientId)) throw new UI.CancelledError()

            const hasSecret = await prompts.confirm({
              message: t("cli.mcp.add.prompt.has-secret"),
              initialValue: false,
            })
            if (prompts.isCancel(hasSecret)) throw new UI.CancelledError()

            let clientSecret: string | undefined
            if (hasSecret) {
              const secret = await prompts.password({
                message: t("cli.mcp.add.prompt.enter-secret"),
              })
              if (prompts.isCancel(secret)) throw new UI.CancelledError()
              clientSecret = secret
            }

            mcpConfig = {
              type: "remote",
              url,
              oauth: {
                clientId,
                ...(clientSecret && { clientSecret }),
              },
            }
          } else {
            mcpConfig = {
              type: "remote",
              url,
              oauth: {},
            }
          }
        } else {
          mcpConfig = {
            type: "remote",
            url,
          }
        }

        await addMcpToConfig(name, mcpConfig, configPath)
        prompts.log.success(t("cli.mcp.add.success.added", { name, configPath }))
      }

      prompts.outro(t("cli.mcp.add.outro.success"))
    })
  }),
})

export const McpDebugCommand = effectCmd({
  command: "debug <name>",
  describe: t("cli.mcp.debug.describe"),
  builder: (yargs) =>
    yargs.positional("name", {
      describe: t("cli.mcp.debug.positional.name"),
      type: "string",
      demandOption: true,
    }),
  handler: Effect.fn("Cli.mcp.debug")(function* (args) {
    const config = yield* Config.Service.use((cfg) => cfg.get())
    const mcp = yield* MCP.Service
    const auth = yield* McpAuth.Service
    const serverConfig = config.mcp?.[args.name]
    const authInfo =
      serverConfig && isMcpRemote(serverConfig) && serverConfig.oauth !== false
        ? yield* Effect.all({
            authStatus: mcp.getAuthStatus(args.name),
            entry: auth.get(args.name),
          })
        : undefined
    yield* Effect.promise(async () => {
      UI.empty()
      prompts.intro(t("cli.mcp.debug.intro"))

      const serverName = args.name

      if (!serverConfig) {
        prompts.log.error(t("cli.mcp.auth.error.server-not-found", { serverName }))
        prompts.outro(t("cli.mcp.auth.outro.done"))
        return
      }

      if (!isMcpRemote(serverConfig)) {
        prompts.log.error(t("cli.mcp.debug.error.not-remote", { serverName }))
        prompts.outro(t("cli.mcp.auth.outro.done"))
        return
      }

      if (serverConfig.oauth === false) {
        prompts.log.warn(t("cli.mcp.debug.warn.oauth-disabled", { serverName }))
        prompts.outro(t("cli.mcp.auth.outro.done"))
        return
      }

      prompts.log.info(t("cli.mcp.debug.info.server", { serverName }))
      prompts.log.info(t("cli.mcp.debug.info.url", { url: serverConfig.url }))

      const { authStatus, entry } = authInfo!
      prompts.log.info(
        t("cli.mcp.debug.info.auth-status", { icon: getAuthStatusIcon(authStatus), status: getAuthStatusText(authStatus) }),
      )

      if (entry?.tokens) {
        prompts.log.info(
          `  ${t("cli.mcp.debug.info.access-token")} ${entry.tokens.accessToken.length > 8 ? `${entry.tokens.accessToken.slice(0, 4)}***${entry.tokens.accessToken.slice(-4)}` : "***"}`,
        )
        if (entry.tokens.expiresAt) {
          const expiresDate = new Date(entry.tokens.expiresAt * 1000)
          const isExpired = entry.tokens.expiresAt < Date.now() / 1000
          prompts.log.info(
            `  ${t("cli.mcp.debug.info.expires")} ${expiresDate.toISOString()} ${isExpired ? t("cli.mcp.debug.info.expired-tag") : ""}`,
          )
        }
        if (entry.tokens.refreshToken) {
          prompts.log.info(`  ${t("cli.mcp.debug.info.refresh-token")}`)
        }
      }
      if (entry?.clientInfo) {
        prompts.log.info(`  ${t("cli.mcp.debug.info.client-id")} ${entry.clientInfo.clientId}`)
        if (entry.clientInfo.clientSecretExpiresAt) {
          const expiresDate = new Date(entry.clientInfo.clientSecretExpiresAt * 1000)
          prompts.log.info(`  ${t("cli.mcp.debug.info.client-secret-expires")} ${expiresDate.toISOString()}`)
        }
      }

      const spinner = prompts.spinner()
      spinner.start(t("cli.mcp.debug.spinner.testing"))

      // Test basic HTTP connectivity first
      try {
        const response = await fetch(serverConfig.url, {
          method: "POST",
          headers: {
            ...serverConfig.headers,
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "initialize",
            params: {
              protocolVersion: LATEST_PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "opencode-debug", version: InstallationVersion },
            },
            id: 1,
          }),
        })

        spinner.stop(t("cli.mcp.debug.spinner.http-response", { status: response.status, statusText: response.statusText }))

        // Check for WWW-Authenticate header
        const wwwAuth = response.headers.get("www-authenticate")
        if (wwwAuth) {
          prompts.log.info(t("cli.mcp.debug.info.www-authenticate", { wwwAuth }))
        }

        if (response.status === 401) {
          prompts.log.info(t("cli.mcp.debug.info.requires-oauth"))

          // Try to discover OAuth metadata
          const oauthConfig = typeof serverConfig.oauth === "object" ? serverConfig.oauth : undefined
          const authProvider = new McpOAuthProvider(
            serverName,
            serverConfig.url,
            {
              clientId: oauthConfig?.clientId,
              clientSecret: oauthConfig?.clientSecret,
              scope: oauthConfig?.scope,
              redirectUri: oauthConfig?.redirectUri,
            },
            {
              onRedirect: async () => {},
            },
            auth,
          )

          prompts.log.info(t("cli.mcp.debug.info.testing-oauth-flow"))

          // Try creating transport with auth provider to trigger discovery
          const transport = new StreamableHTTPClientTransport(new URL(serverConfig.url), {
            authProvider,
            requestInit: serverConfig.headers ? { headers: serverConfig.headers } : undefined,
          })

          try {
            const client = new Client({
              name: "opencode-debug",
              version: InstallationVersion,
            })
            await client.connect(transport)
            prompts.log.success(t("cli.mcp.debug.success.already-auth"))
            await client.close()
          } catch (error) {
            if (error instanceof UnauthorizedError) {
              prompts.log.info(t("cli.mcp.debug.info.oauth-triggered", { message: error.message }))

              // Check if dynamic registration would be attempted
              const clientInfo = await authProvider.clientInformation()
              if (clientInfo) {
                prompts.log.info(t("cli.mcp.debug.info.client-id-available", { clientId: clientInfo.client_id }))
              } else {
                prompts.log.info(t("cli.mcp.debug.info.no-client-id"))
              }
            } else {
              prompts.log.error(
                t("cli.mcp.debug.error.connection-error", { message: error instanceof Error ? error.message : String(error) }),
              )
            }
          }
        } else if (response.status >= 200 && response.status < 300) {
          prompts.log.success(t("cli.mcp.debug.success.no-auth-required"))
          const body = await response.text()
          try {
            const json = JSON.parse(body)
            if (json.result?.serverInfo) {
              prompts.log.info(t("cli.mcp.debug.info.server-info", { json: JSON.stringify(json.result.serverInfo) }))
            }
          } catch {
            // Not JSON, ignore
          }
        } else {
          prompts.log.warn(t("cli.mcp.debug.warn.unexpected-status", { status: response.status }))
          const body = await response.text().catch(() => "")
          if (body) {
            prompts.log.info(t("cli.mcp.debug.info.response-body", { body: body.substring(0, 500) }))
          }
        }
      } catch (error) {
        spinner.stop(t("cli.mcp.debug.spinner.connection-failed"), 1)
        prompts.log.error(t("cli.mcp.debug.error.generic", { message: error instanceof Error ? error.message : String(error) }))
      }

      prompts.outro(t("cli.mcp.debug.outro.debug-complete"))
    })
  }),
})

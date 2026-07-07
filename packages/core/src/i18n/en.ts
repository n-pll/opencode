export const dict: Record<string, string> = {
  // cliErrorMessage / FormatError — shared by the CLI and the TUI error renderers.
  "core.error.modelNotFound": "Model not found: {{providerID}}/{{modelID}}",
  "core.error.modelNotFound.suggest": "Did you mean: {{suggestions}}",
  "core.error.modelNotFound.tryModels": "Try: `opencode models` to list available models",
  "core.error.modelNotFound.checkConfig": "Or check your config (opencode.json) provider/model names",
  "core.error.providerInit": 'Failed to initialize provider "{{providerID}}". Check credentials and configuration.',
  "core.error.configJson": "Config file at {{path}} is not valid JSON(C)",
  "core.error.configJson.withMessage": "Config file at {{path}} is not valid JSON(C): {{message}}",
  "core.error.configDirectoryTypo":
    'Directory "{{dir}}" in {{path}} is not valid. Rename the directory to "{{suggestion}}" or remove it. This is a common typo.',
  "core.error.configInvalid": "Configuration is invalid",
  "core.error.configInvalid.at": "Configuration is invalid at {{path}}",
  "core.error.configInvalid.withMessage": "Configuration is invalid: {{message}}",
  "core.error.configInvalid.atWithMessage": "Configuration is invalid at {{path}}: {{message}}",
  "core.error.mcpFailed": 'MCP server "{{name}}" failed. Note, opencode does not support MCP authentication yet.',

  // ConfigRemoteAuthError
  "core.error.remoteAuth.failed": "Failed to load remote config: the server returned a login page instead of JSON.",
  "core.error.remoteAuth.failedFrom": "Failed to load remote config from {{remote}}: the server returned a login page instead of JSON.",
  "core.error.remoteAuth.explanation": "Authentication is missing or has expired (the endpoint is likely behind an SSO or identity-aware proxy).",
  "core.error.remoteAuth.relogin": "Run `opencode auth login {{url}}` to re-authenticate.",

  // errorFormat / errorMessage generic fallbacks.
  "core.error.unserializable": "Unexpected error (unserializable)",
  "core.error.unknown": "unknown error",
  "core.error.noMessage": "{{prefix}} (no message)",
  "core.error.objectShape": "{{prefix}} { {{names}} }",
}

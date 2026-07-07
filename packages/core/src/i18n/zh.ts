import { dict as en } from "./en"

type Keys = keyof typeof en

export const dict: Partial<Record<Keys, string>> = {
  "core.error.modelNotFound": "未找到模型：{{providerID}}/{{modelID}}",
  "core.error.modelNotFound.suggest": "你是否想使用：{{suggestions}}",
  "core.error.modelNotFound.tryModels": "请尝试：运行 `opencode models` 列出可用模型",
  "core.error.modelNotFound.checkConfig": "或检查配置文件（opencode.json）中的 provider/model 名称",
  "core.error.providerInit": "初始化 provider「{{providerID}}」失败。请检查凭据和配置。",
  "core.error.configJson": "位于 {{path}} 的配置文件不是有效的 JSON(C)",
  "core.error.configJson.withMessage": "位于 {{path}} 的配置文件不是有效的 JSON(C)：{{message}}",
  "core.error.configDirectoryTypo":
    "{{path}} 中的目录「{{dir}}」无效。请将该目录重命名为「{{suggestion}}」或将其删除。这是一个常见拼写错误。",
  "core.error.configInvalid": "配置无效",
  "core.error.configInvalid.at": "{{path}} 处的配置无效",
  "core.error.configInvalid.withMessage": "配置无效：{{message}}",
  "core.error.configInvalid.atWithMessage": "{{path}} 处的配置无效：{{message}}",
  "core.error.mcpFailed": "MCP 服务器「{{name}}」失败。注意，opencode 暂不支持 MCP 身份验证。",

  "core.error.remoteAuth.failed": "加载远程配置失败：服务器返回了登录页面而非 JSON。",
  "core.error.remoteAuth.failedFrom": "从 {{remote}} 加载远程配置失败：服务器返回了登录页面而非 JSON。",
  "core.error.remoteAuth.explanation": "身份验证缺失或已过期（该端点可能位于 SSO 或身份感知代理之后）。",
  "core.error.remoteAuth.relogin": "运行 `opencode auth login {{url}}` 重新进行身份验证。",

  "core.error.unserializable": "意外的错误（无法序列化）",
  "core.error.unknown": "未知错误",
  "core.error.noMessage": "{{prefix}}（无错误信息）",
  "core.error.objectShape": "{{prefix}} { {{names}} }",
}

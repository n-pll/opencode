import { dict as en } from "./en"

type Keys = keyof typeof en

export const dict: Partial<Record<Keys, string>> = {
  "llm.generate_object.description": "通过调用此工具返回结构化结果。",
  "llm.error.http_transport_failed": "HTTP 传输失败",
  "llm.error.invalid_ws_url": "无效的 WebSocket URL",
  "llm.error.ws_construct_failed": "构造 WebSocket 失败",
  "llm.error.ws_send_failed": "发送 WebSocket 消息失败",
  "llm.error.cloudflareaigateway_configure_requires_accountid_u": "CloudflareAIGateway.configure 需要 accountId，除非提供了 baseURL",
  "llm.error.cloudflareworkersai_configure_requires_accountid_u": "CloudflareWorkersAI.configure 需要 accountId，除非提供了 baseURL",
  "llm.llm.generateobject-model-did-not-call-the-forced-tool": "generateObject：模型未调用强制的 \\`{{GENERATE_OBJECT_TOOL_NAME}}\\` 工具",
  "llm.llm.generateobject-tool-input-failed-schema-decode": "generateObject：工具输入 schema 解码失败：{{message}}",
  "llm.tool_runtime.invalid-tool-input": "无效的工具输入：{{message}}",
  "llm.tool_runtime.tool-returned-an-invalid-value-for-its-success-schema": "工具为其成功 schema 返回了无效值：{{message}}",
  "llm.auth.failed-to-resolve-auth-config": "解析认证配置失败：{{message}}",
  "llm.client.route-model-requires-a-provider": "Route.model({{id}}) 需要提供商",
  "llm.client.route-model-requires-an-endpoint-baseurl-configure-it-on-the": "Route.model({{id}}) 需要端点 baseURL——请先在路由上配置它",
  "llm.websocket.unsupported-websocket-url-protocol": "不支持的 WebSocket URL 协议 {{protocol}}",
}

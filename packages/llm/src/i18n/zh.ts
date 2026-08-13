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
}

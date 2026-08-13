import { dict as en } from "./en"

type Keys = keyof typeof en

export const dict: Partial<Record<Keys, string>> = {
  "server.error.invalid_cursor": "无效的游标",
  "server.error.unexpected": "意外的服务器错误。请检查服务器日志了解详情。",
  "server.error.cursor_with_order": "游标不能与 order 组合使用",
  "server.error.authentication_failed": "认证失败",
  "server.error.authorization_code_required": "需要授权代码",
  "server.error.invalid_pty_token": "无效的 PTY 连接令牌请求",
  "server.error.authentication_required": "需要认证",
  "server.error.invalid_session_id": "无效的会话 ID",
  "server.session_location.session-not-found": "",
  "server.message.session-not-found": "",
  "server.permission.permission-request-not-found": "",
  "server.permission.session-not-found": "",
  "server.provider.provider-not-found": "",
  "server.pty.pty-session-not-found": "",
  "server.question.question-request-not-found": "",
  "server.session.session-not-found": "",
  "server.session.prompt-message-id-conflicts-with-an-existing-durable-record": "",
  "server.session.session-is-not-available-yet": "",
  "server.session.message-not-found": "",
}

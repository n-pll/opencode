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
  "server.session_location.session-not-found": "会话未找到：{{sessionID}}",
  "server.message.session-not-found": "会话未找到：{{sessionID}}",
  "server.permission.permission-request-not-found": "权限请求未找到：{{id}}",
  "server.permission.session-not-found": "会话未找到：{{sessionID}}",
  "server.provider.provider-not-found": "提供商未找到：{{providerID}}",
  "server.pty.pty-session-not-found": "PTY 会话未找到：{{ptyID}}",
  "server.question.question-request-not-found": "问题请求未找到：{{id}}",
  "server.session.session-not-found": "会话未找到：{{sessionID}}",
  "server.session.prompt-message-id-conflicts-with-an-existing-durable-record": "提示消息 ID 与现有持久记录冲突：{{messageID}}",
  "server.session.session-is-not-available-yet": "会话 {{operation}} 尚不可用",
  "server.session.message-not-found": "消息未找到：{{messageID}}",
}

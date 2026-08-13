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
}

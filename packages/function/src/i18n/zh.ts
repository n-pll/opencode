import { dict as en } from "./en"

type Keys = keyof typeof en

export const dict: Partial<Record<Keys, string>> = {
  "function.error.invalid_secret": "无效的密钥",
  "function.error.invalid_admin_secret": "无效的管理员密钥",
  "function.error.discord_message_failed": "Discord 机器人消息发送失败",
  "function.error.authorization_required": "需要 Authorization 请求头",
  "function.error.token_verification_failed": "令牌验证失败",
  "function.error.no_write_permissions": "用户没有写入权限",
  "function.error.invalid_key": "错误：无效的密钥",
  "function.error.upgrade_required": "错误：需要 Upgrade 请求头",
  "function.error.share_id_required": "错误：需要 Share ID",
  "function.error.invalid_or_expired_token": "无效或过期的令牌",
  "function.api.": "",
}

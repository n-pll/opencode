import { dict as en } from "./en"

type Keys = keyof typeof en

export const dict: Partial<Record<Keys, string>> = {
  "enterprise.error.no_storage_adapter": "未配置存储适配器",
  "enterprise.api.title": "Opencode 企业版 API",
  "enterprise.api.title_endpoints": "Opencode 企业版 API 端点",
  "enterprise.api.create_share": "创建分享",
  "enterprise.api.sync_share": "同步分享数据",
  "enterprise.api.get_share": "获取分享数据",
  "enterprise.api.remove_share": "移除分享",
  "enterprise.error.unauthorized": "未授权",
  "enterprise.error.invalid_request": "无效的请求",
  "enterprise.api.share_removed": "分享已移除",
  "enterprise.error.session_data_missing_schema": "SessionDataMissingError 未暴露 schema",
  "enterprise.error.missing_shareID": "缺少 shareID",
}

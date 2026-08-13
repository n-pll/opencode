import { dict as en } from "./en"

type Keys = keyof typeof en

export const dict: Partial<Record<Keys, string>> = {
  // project.ts
  "schema.project.startup_script": "创建新工作区（worktree）时运行的启动脚本",

  // question.ts (v1 + v2 share the same field descriptions)
  "schema.question.option.label": "显示文本（1-5 个词，简明扼要）",
  "schema.question.option.description": "选项的解释",
  "schema.question.info.question": "完整问题",
  "schema.question.info.header": "非常简短的标签（最多 30 字符）",
  "schema.question.info.options": "可用的选项",
  "schema.question.info.multiple": "允许选择多个选项",
  "schema.question.info.custom": "允许输入自定义答案（默认：true）",
  "schema.question.info.questions": "要询问的问题",
  "schema.question.info.answers": "按问题顺序排列的用户答案（每个答案是一个所选标签的数组）",

  // session-todo.ts
  "schema.session_todo.content": "任务的简要描述",
  "schema.session_todo.status": "任务的当前状态：pending、in_progress、completed、cancelled",
  "schema.session_todo.priority": "任务的优先级：high、medium、low",

  // tui-event.ts
  "schema.tui_event.duration": "持续时间（毫秒）",
  "schema.tui_event.session_select.sessionID": "要导航到的会话 ID",
  "schema.event.duplicate-latest-event-definition-for": "{{type}} 的 latest 事件定义重复",
  "schema.event.duplicate-durable-event-definition-for": "{{key}} 的持久事件定义重复",
  "schema.workspace_id.id-does-not-start-with-wrk": "ID {{id}} 不以 wrk 开头",
}

export const dict: Record<string, string> = {
  // project.ts
  "schema.project.startup_script": "Startup script to run when creating a new workspace (worktree)",

  // question.ts (v1 + v2 share the same field descriptions)
  "schema.question.option.label": "Display text (1-5 words, concise)",
  "schema.question.option.description": "Explanation of choice",
  "schema.question.info.question": "Complete question",
  "schema.question.info.header": "Very short label (max 30 chars)",
  "schema.question.info.options": "Available choices",
  "schema.question.info.multiple": "Allow selecting multiple choices",
  "schema.question.info.custom": "Allow typing a custom answer (default: true)",
  "schema.question.info.questions": "Questions to ask",
  "schema.question.info.answers": "User answers in order of questions (each answer is an array of selected labels)",

  // session-todo.ts
  "schema.session_todo.content": "Brief description of the task",
  "schema.session_todo.status": "Current status of the task: pending, in_progress, completed, cancelled",
  "schema.session_todo.priority": "Priority level of the task: high, medium, low",

  // tui-event.ts
  "schema.tui_event.duration": "Duration in milliseconds",
  "schema.tui_event.session_select.sessionID": "Session ID to navigate to",
}

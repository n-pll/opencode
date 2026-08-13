import { t } from "../i18n/t"
export * as TuiKeybind from "./keybind"

import type { KeyEvent, Renderable } from "@opentui/core"
import type { Binding } from "@opentui/keymap"
import type { BindingCommandMap, BindingConfig, BindingDefaults } from "@opentui/keymap/extras"
import { Schema } from "effect"
import type { I18nParams } from "@opencode-ai/core/i18n"

const KeyStroke = Schema.Struct({
  name: Schema.String,
  ctrl: Schema.optional(Schema.Boolean),
  shift: Schema.optional(Schema.Boolean),
  meta: Schema.optional(Schema.Boolean),
  super: Schema.optional(Schema.Boolean),
  hyper: Schema.optional(Schema.Boolean),
})

const BindingObject = Schema.StructWithRest(
  Schema.Struct({
    key: Schema.Union([Schema.String, KeyStroke]),
    event: Schema.optional(Schema.Literals(["press", "release"])),
    preventDefault: Schema.optional(Schema.Boolean),
    fallthrough: Schema.optional(Schema.Boolean),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
)

const BindingItem = Schema.Union([Schema.String, KeyStroke, BindingObject])
export const BindingValueSchema = Schema.Union([
  Schema.Literal(false),
  Schema.Literal("none"),
  BindingItem,
  Schema.Array(BindingItem),
])
export type BindingValueSchema = Schema.Schema.Type<typeof BindingValueSchema>

type Definition = {
  default: BindingValueSchema
  description: string
}

export const LeaderDefault = "ctrl+x"

const keybind = (value: Definition["default"], description: string): Definition => ({ default: value, description })

export const Definitions = {
  leader: keybind(LeaderDefault, "tui.keybind.leader"),

  app_exit: keybind("ctrl+c,ctrl+d,<leader>q", "tui.keybind.app_exit"),
  app_debug: keybind("none", "tui.keybind.app_debug"),
  app_console: keybind("none", "tui.keybind.app_console"),
  app_heap_snapshot: keybind("none", "tui.keybind.app_heap_snapshot"),
  app_toggle_animations: keybind("none", "tui.keybind.app_toggle_animations"),
  app_toggle_file_context: keybind("none", "tui.keybind.app_toggle_file_context"),
  app_toggle_diffwrap: keybind("none", "tui.keybind.app_toggle_diffwrap"),
  app_toggle_paste_summary: keybind("none", "tui.keybind.app_toggle_paste_summary"),
  app_toggle_session_directory_filter: keybind("none", "tui.keybind.app_toggle_session_directory_filter"),
  command_list: keybind("ctrl+p", "tui.keybind.command_list"),
  help_show: keybind("none", "tui.keybind.help_show"),
  docs_open: keybind("none", "tui.keybind.docs_open"),
  diff_open: keybind("none", "tui.keybind.diff_open"),
  diff_close: keybind("escape,q", "tui.keybind.diff_close"),
  diff_toggle: keybind("enter,space", "tui.keybind.diff_toggle"),
  diff_expand: keybind("right", "tui.keybind.diff_expand"),
  diff_expand_all: keybind("E", "tui.keybind.diff_expand_all"),
  diff_collapse: keybind("left", "tui.keybind.diff_collapse"),
  diff_switch_focus: keybind("tab", "tui.keybind.diff_switch_focus"),
  diff_next_hunk: keybind("]", "tui.keybind.diff_next_hunk"),
  diff_previous_hunk: keybind("[", "tui.keybind.diff_previous_hunk"),
  diff_next_file: keybind("n", "tui.keybind.diff_next_file"),
  diff_previous_file: keybind("p", "tui.keybind.diff_previous_file"),
  diff_toggle_file_tree: keybind("b", "tui.keybind.diff_toggle_file_tree"),
  diff_single_patch: keybind("s", "tui.keybind.diff_single_patch"),
  diff_switch_source: keybind("d", "tui.keybind.diff_switch_source"),
  diff_toggle_view: keybind("v", "tui.keybind.diff_toggle_view"),
  diff_help: keybind("?", "tui.keybind.diff_help"),

  editor_open: keybind("<leader>e", "tui.keybind.editor_open"),
  theme_list: keybind("<leader>t", "tui.keybind.theme_list"),
  theme_switch_mode: keybind("none", "tui.keybind.theme_switch_mode"),
  theme_mode_lock: keybind("none", "tui.keybind.theme_mode_lock"),
  sidebar_toggle: keybind("<leader>b", "tui.keybind.sidebar_toggle"),
  scrollbar_toggle: keybind("none", "tui.keybind.scrollbar_toggle"),
  status_view: keybind("<leader>s", "tui.keybind.status_view"),
  debug_view: keybind("none", "tui.keybind.debug_view"),

  session_export: keybind("<leader>x", "tui.keybind.session_export"),
  session_copy: keybind("none", "tui.keybind.session_copy"),
  session_move: keybind("none", "tui.keybind.session_move"),
  session_new: keybind("<leader>n", "tui.keybind.session_new"),
  session_list: keybind("<leader>l", "tui.keybind.session_list"),
  session_timeline: keybind("<leader>g", "tui.keybind.session_timeline"),
  session_fork: keybind("none", "tui.keybind.session_fork"),
  session_rename: keybind("ctrl+r", "tui.keybind.session_rename"),
  session_delete: keybind("ctrl+d", "tui.keybind.session_delete"),
  session_share: keybind("none", "tui.keybind.session_share"),
  session_unshare: keybind("none", "tui.keybind.session_unshare"),
  session_interrupt: keybind("escape", "tui.keybind.session_interrupt"),
  session_background: keybind("ctrl+b", "tui.keybind.session_background"),
  session_compact: keybind("<leader>c", "tui.keybind.session_compact"),
  session_toggle_timestamps: keybind("none", "tui.keybind.session_toggle_timestamps"),
  session_toggle_generic_tool_output: keybind("none", "tui.keybind.session_toggle_generic_tool_output"),
  session_queued_prompts: keybind("<leader>q", "tui.keybind.session_queued_prompts"),
  session_child_first: keybind("<leader>down", "tui.keybind.session_child_first"),
  session_child_cycle: keybind("right", "tui.keybind.session_child_cycle"),
  session_child_cycle_reverse: keybind("left", "tui.keybind.session_child_cycle_reverse"),
  session_parent: keybind("up", "tui.keybind.session_parent"),
  session_pin_toggle: keybind("ctrl+f", "tui.keybind.session_pin_toggle"),
  session_quick_switch_1: keybind("<leader>1", "tui.keybind.session_quick_switch"),
  session_quick_switch_2: keybind("<leader>2", "tui.keybind.session_quick_switch"),
  session_quick_switch_3: keybind("<leader>3", "tui.keybind.session_quick_switch"),
  session_quick_switch_4: keybind("<leader>4", "tui.keybind.session_quick_switch"),
  session_quick_switch_5: keybind("<leader>5", "tui.keybind.session_quick_switch"),
  session_quick_switch_6: keybind("<leader>6", "tui.keybind.session_quick_switch"),
  session_quick_switch_7: keybind("<leader>7", "tui.keybind.session_quick_switch"),
  session_quick_switch_8: keybind("<leader>8", "tui.keybind.session_quick_switch"),
  session_quick_switch_9: keybind("<leader>9", "tui.keybind.session_quick_switch"),

  stash_delete: keybind("ctrl+d", "tui.keybind.stash_delete"),
  model_provider_list: keybind("ctrl+a", "tui.keybind.model_provider_list"),
  model_favorite_toggle: keybind("ctrl+f", "tui.keybind.model_favorite_toggle"),
  model_list: keybind("<leader>m", "tui.keybind.model_list"),
  model_cycle_recent: keybind("f2", "tui.keybind.model_cycle_recent"),
  model_cycle_recent_reverse: keybind("shift+f2", "tui.keybind.model_cycle_recent_reverse"),
  model_cycle_favorite: keybind("none", "tui.keybind.model_cycle_favorite"),
  model_cycle_favorite_reverse: keybind("none", "tui.keybind.model_cycle_favorite_reverse"),
  mcp_list: keybind("none", "tui.keybind.mcp_list"),
  provider_connect: keybind("none", "tui.keybind.provider_connect"),
  console_org_switch: keybind("none", "tui.keybind.console_org_switch"),
  agent_list: keybind("<leader>a", "tui.keybind.agent_list"),
  agent_cycle: keybind("tab", "tui.keybind.agent_cycle"),
  agent_cycle_reverse: keybind("shift+tab", "tui.keybind.agent_cycle_reverse"),
  variant_cycle: keybind("ctrl+t", "tui.keybind.variant_cycle"),
  variant_list: keybind("none", "tui.keybind.variant_list"),

  messages_page_up: keybind("pageup,ctrl+alt+b", "tui.keybind.messages_page_up"),
  messages_page_down: keybind("pagedown,ctrl+alt+f", "tui.keybind.messages_page_down"),
  messages_line_up: keybind("ctrl+alt+y", "tui.keybind.messages_line_up"),
  messages_line_down: keybind("ctrl+alt+e", "tui.keybind.messages_line_down"),
  messages_half_page_up: keybind("ctrl+alt+u", "tui.keybind.messages_half_page_up"),
  messages_half_page_down: keybind("ctrl+alt+d", "tui.keybind.messages_half_page_down"),
  messages_first: keybind("ctrl+g,home", "tui.keybind.messages_first"),
  messages_last: keybind("ctrl+alt+g,end", "tui.keybind.messages_last"),
  messages_next: keybind("none", "tui.keybind.messages_next"),
  messages_previous: keybind("none", "tui.keybind.messages_previous"),
  messages_last_user: keybind("none", "tui.keybind.messages_last_user"),
  messages_copy: keybind("<leader>y", "tui.keybind.messages_copy"),
  messages_undo: keybind("<leader>u", "tui.keybind.messages_undo"),
  messages_redo: keybind("<leader>r", "tui.keybind.messages_redo"),
  messages_toggle_conceal: keybind("<leader>h", "tui.keybind.messages_toggle_conceal"),
  tool_details: keybind("none", "tui.keybind.tool_details"),
  display_thinking: keybind("none", "tui.keybind.display_thinking"),

  prompt_submit: keybind("none", "tui.keybind.prompt_submit"),
  prompt_editor_context_clear: keybind("none", "tui.keybind.prompt_editor_context_clear"),
  prompt_skills: keybind("none", "tui.keybind.prompt_skills"),
  prompt_stash: keybind("none", "tui.keybind.prompt_stash"),
  prompt_stash_pop: keybind("none", "tui.keybind.prompt_stash_pop"),
  prompt_stash_list: keybind("none", "tui.keybind.prompt_stash_list"),
  workspace_set: keybind("none", "tui.keybind.workspace_set"),

  input_clear: keybind("ctrl+c", "tui.keybind.input_clear"),
  input_paste: keybind({ key: "ctrl+v", preventDefault: false }, "tui.keybind.input_paste"),
  input_submit: keybind("return", "tui.keybind.input_submit"),
  input_newline: keybind("shift+return,ctrl+return,alt+return,ctrl+j", "tui.keybind.input_newline"),
  input_move_left: keybind("left,ctrl+b", "tui.keybind.input_move_left"),
  input_move_right: keybind("right,ctrl+f", "tui.keybind.input_move_right"),
  input_move_up: keybind("up", "tui.keybind.input_move_up"),
  input_move_down: keybind("down", "tui.keybind.input_move_down"),
  input_select_left: keybind("shift+left", "tui.keybind.input_select_left"),
  input_select_right: keybind("shift+right", "tui.keybind.input_select_right"),
  input_select_up: keybind("shift+up", "tui.keybind.input_select_up"),
  input_select_down: keybind("shift+down", "tui.keybind.input_select_down"),
  input_line_home: keybind("ctrl+a", "tui.keybind.input_line_home"),
  input_line_end: keybind("ctrl+e", "tui.keybind.input_line_end"),
  input_select_line_home: keybind("ctrl+shift+a", "tui.keybind.input_select_line_home"),
  input_select_line_end: keybind("ctrl+shift+e", "tui.keybind.input_select_line_end"),
  input_visual_line_home: keybind("alt+a", "tui.keybind.input_visual_line_home"),
  input_visual_line_end: keybind("alt+e", "tui.keybind.input_visual_line_end"),
  input_select_visual_line_home: keybind("alt+shift+a", "tui.keybind.input_select_visual_line_home"),
  input_select_visual_line_end: keybind("alt+shift+e", "tui.keybind.input_select_visual_line_end"),
  input_buffer_home: keybind("home", "tui.keybind.input_buffer_home"),
  input_buffer_end: keybind("end", "tui.keybind.input_buffer_end"),
  input_select_buffer_home: keybind("shift+home", "tui.keybind.input_select_buffer_home"),
  input_select_buffer_end: keybind("shift+end", "tui.keybind.input_select_buffer_end"),
  input_delete_line: keybind("ctrl+shift+d", "tui.keybind.input_delete_line"),
  input_delete_to_line_end: keybind("ctrl+k", "tui.keybind.input_delete_to_line_end"),
  input_delete_to_line_start: keybind("ctrl+u", "tui.keybind.input_delete_to_line_start"),
  input_backspace: keybind("backspace,shift+backspace", "tui.keybind.input_backspace"),
  input_delete: keybind("ctrl+d,delete,shift+delete", "tui.keybind.input_delete"),
  input_undo: keybind("ctrl+-,super+z", "tui.keybind.input_undo"),
  input_redo: keybind("ctrl+.,super+shift+z", "tui.keybind.input_redo"),
  input_word_forward: keybind("alt+f,alt+right,ctrl+right", "tui.keybind.input_word_forward"),
  input_word_backward: keybind("alt+b,alt+left,ctrl+left", "tui.keybind.input_word_backward"),
  input_select_word_forward: keybind("alt+shift+f,alt+shift+right", "tui.keybind.input_select_word_forward"),
  input_select_word_backward: keybind("alt+shift+b,alt+shift+left", "tui.keybind.input_select_word_backward"),
  input_delete_word_forward: keybind("alt+d,alt+delete,ctrl+delete", "tui.keybind.input_delete_word_forward"),
  input_delete_word_backward: keybind("ctrl+w,ctrl+backspace,alt+backspace", "tui.keybind.input_delete_word_backward"),
  input_select_all: keybind("super+a", "tui.keybind.input_select_all"),
  history_previous: keybind("up", "tui.keybind.history_previous"),
  history_next: keybind("down", "tui.keybind.history_next"),

  "dialog.select.prev": keybind("up,ctrl+p", "tui.keybind.dialog.select.prev"),
  "dialog.select.next": keybind("down,ctrl+n", "tui.keybind.dialog.select.next"),
  "dialog.select.page_up": keybind("pageup", "tui.keybind.dialog.select.page_up"),
  "dialog.select.page_down": keybind("pagedown", "tui.keybind.dialog.select.page_down"),
  "dialog.select.home": keybind("home", "tui.keybind.dialog.select.home"),
  "dialog.select.end": keybind("end", "tui.keybind.dialog.select.end"),
  "dialog.select.submit": keybind("return", "tui.keybind.dialog.select.submit"),
  "dialog.prompt.submit": keybind("return", "tui.keybind.dialog.prompt.submit"),
  "dialog.mcp.toggle": keybind("space", "tui.keybind.dialog.mcp.toggle"),
  "dialog.move_session.new": keybind("ctrl+m", "tui.keybind.dialog.move_session.new"),
  "dialog.move_session.delete": keybind("ctrl+d", "tui.keybind.dialog.move_session.delete"),
  "dialog.move_session.refresh": keybind("ctrl+r", "tui.keybind.dialog.move_session.refresh"),
  "prompt.autocomplete.prev": keybind("up,ctrl+p", "tui.keybind.prompt.autocomplete.prev"),
  "prompt.autocomplete.next": keybind("down,ctrl+n", "tui.keybind.prompt.autocomplete.next"),
  "prompt.autocomplete.hide": keybind("escape", "tui.keybind.prompt.autocomplete.hide"),
  "prompt.autocomplete.select": keybind("return", "tui.keybind.prompt.autocomplete.select"),
  "prompt.autocomplete.complete": keybind("tab", "tui.keybind.prompt.autocomplete.complete"),
  "permission.prompt.fullscreen": keybind("ctrl+f", "tui.keybind.permission.prompt.fullscreen"),
  "plugins.toggle": keybind("space", "tui.keybind.plugins.toggle"),
  "dialog.plugins.install": keybind("shift+i", "tui.keybind.dialog.plugins.install"),

  terminal_suspend: keybind("ctrl+z", "tui.keybind.terminal_suspend"),
  terminal_title_toggle: keybind("none", "tui.keybind.terminal_title_toggle"),
  tips_toggle: keybind("<leader>h", "tui.keybind.tips_toggle"),
  plugin_manager: keybind("none", "tui.keybind.plugin_manager"),
  plugin_install: keybind("none", "tui.keybind.plugin_install"),

  which_key_toggle: keybind("ctrl+alt+k", "tui.keybind.which_key_toggle"),
  which_key_layout_toggle: keybind("ctrl+alt+shift+k", "tui.keybind.which_key_layout_toggle"),
  which_key_pending_toggle: keybind("ctrl+alt+shift+p", "tui.keybind.which_key_pending_toggle"),
  which_key_group_previous: keybind("ctrl+alt+left,ctrl+alt+[", "tui.keybind.which_key_group_previous"),
  which_key_group_next: keybind("ctrl+alt+right,ctrl+alt+]", "tui.keybind.which_key_group_next"),
  which_key_scroll_up: keybind("ctrl+alt+up,ctrl+alt+p", "tui.keybind.which_key_scroll_up"),
  which_key_scroll_down: keybind("ctrl+alt+down,ctrl+alt+n", "tui.keybind.which_key_scroll_down"),
  which_key_page_up: keybind("ctrl+alt+pageup", "tui.keybind.which_key_page_up"),
  which_key_page_down: keybind("ctrl+alt+pagedown", "tui.keybind.which_key_page_down"),
  which_key_home: keybind("ctrl+alt+home", "tui.keybind.which_key_home"),
  which_key_end: keybind("ctrl+alt+end", "tui.keybind.which_key_end"),
} satisfies Record<string, Definition>

type KeybindName = keyof typeof Definitions
const KeybindNames = new Set<string>(Object.keys(Definitions))

export const KeybindOverrides = Schema.Struct(
  Object.fromEntries(
    Object.entries(Definitions).map(([name, item]) => [
      name,
      Schema.optional(BindingValueSchema).annotate({ description: item.description }),
    ]),
  ),
).annotate({ description: t("tui.keybind.tui-keybinding-overrides") })
export const Descriptions = Object.fromEntries(
  Object.entries(Definitions).map(([name, item]) => [name, item.description]),
) as Record<KeybindName, string>
export const CommandMap = {
  app_exit: "app.exit",
  app_debug: "app.debug",
  app_console: "app.console",
  app_heap_snapshot: "app.heap_snapshot",
  app_toggle_animations: "app.toggle.animations",
  app_toggle_file_context: "app.toggle.file_context",
  app_toggle_diffwrap: "app.toggle.diffwrap",
  app_toggle_paste_summary: "app.toggle.paste_summary",
  app_toggle_session_directory_filter: "app.toggle.session_directory_filter",
  command_list: "command.palette.show",
  help_show: "help.show",
  docs_open: "docs.open",
  diff_open: "diff.open",
  diff_close: "diff.close",
  diff_toggle: "diff.toggle",
  diff_expand: "diff.expand",
  diff_expand_all: "diff.expand_all",
  diff_collapse: "diff.collapse",
  diff_switch_focus: "diff.switch_focus",
  diff_next_hunk: "diff.next_hunk",
  diff_previous_hunk: "diff.previous_hunk",
  diff_next_file: "diff.next_file",
  diff_previous_file: "diff.previous_file",
  diff_toggle_file_tree: "diff.toggle_file_tree",
  diff_single_patch: "diff.single_patch",
  diff_switch_source: "diff.switch_source",
  diff_toggle_view: "diff.toggle_view",
  diff_help: "diff.help",
  editor_open: "prompt.editor",
  theme_list: "theme.switch",
  theme_switch_mode: "theme.switch_mode",
  theme_mode_lock: "theme.mode.lock",
  sidebar_toggle: "session.sidebar.toggle",
  scrollbar_toggle: "session.toggle.scrollbar",
  status_view: "opencode.status",
  debug_view: "opencode.debug",
  session_export: "session.export",
  session_copy: "session.copy",
  session_move: "session.move",
  session_new: "session.new",
  session_list: "session.list",
  session_timeline: "session.timeline",
  session_fork: "session.fork",
  session_rename: "session.rename",
  session_delete: "session.delete",
  session_share: "session.share",
  session_unshare: "session.unshare",
  session_interrupt: "session.interrupt",
  session_background: "session.background",
  session_compact: "session.compact",
  session_toggle_timestamps: "session.toggle.timestamps",
  session_toggle_generic_tool_output: "session.toggle.generic_tool_output",
  session_queued_prompts: "session.queued_prompts",
  session_child_first: "session.child.first",
  session_child_cycle: "session.child.next",
  session_child_cycle_reverse: "session.child.previous",
  session_parent: "session.parent",
  session_pin_toggle: "session.pin.toggle",
  session_quick_switch_1: "session.quick_switch.1",
  session_quick_switch_2: "session.quick_switch.2",
  session_quick_switch_3: "session.quick_switch.3",
  session_quick_switch_4: "session.quick_switch.4",
  session_quick_switch_5: "session.quick_switch.5",
  session_quick_switch_6: "session.quick_switch.6",
  session_quick_switch_7: "session.quick_switch.7",
  session_quick_switch_8: "session.quick_switch.8",
  session_quick_switch_9: "session.quick_switch.9",
  stash_delete: "stash.delete",
  model_provider_list: "model.dialog.provider",
  model_favorite_toggle: "model.dialog.favorite",
  model_list: "model.list",
  model_cycle_recent: "model.cycle_recent",
  model_cycle_recent_reverse: "model.cycle_recent_reverse",
  model_cycle_favorite: "model.cycle_favorite",
  model_cycle_favorite_reverse: "model.cycle_favorite_reverse",
  mcp_list: "mcp.list",
  provider_connect: "provider.connect",
  console_org_switch: "console.org.switch",
  agent_list: "agent.list",
  agent_cycle: "agent.cycle",
  agent_cycle_reverse: "agent.cycle.reverse",
  variant_cycle: "variant.cycle",
  variant_list: "variant.list",
  messages_page_up: "session.page.up",
  messages_page_down: "session.page.down",
  messages_line_up: "session.line.up",
  messages_line_down: "session.line.down",
  messages_half_page_up: "session.half.page.up",
  messages_half_page_down: "session.half.page.down",
  messages_first: "session.first",
  messages_last: "session.last",
  messages_next: "session.message.next",
  messages_previous: "session.message.previous",
  messages_last_user: "session.messages_last_user",
  messages_copy: "messages.copy",
  messages_undo: "session.undo",
  messages_redo: "session.redo",
  messages_toggle_conceal: "session.toggle.conceal",
  tool_details: "session.toggle.actions",
  display_thinking: "session.toggle.thinking",
  prompt_submit: "prompt.submit",
  prompt_editor_context_clear: "prompt.editor_context.clear",
  prompt_skills: "prompt.skills",
  prompt_stash: "prompt.stash",
  prompt_stash_pop: "prompt.stash.pop",
  prompt_stash_list: "prompt.stash.list",
  workspace_set: "workspace.set",
  input_clear: "prompt.clear",
  input_paste: "prompt.paste",
  input_submit: "input.submit",
  input_newline: "input.newline",
  input_move_left: "input.move.left",
  input_move_right: "input.move.right",
  input_move_up: "input.move.up",
  input_move_down: "input.move.down",
  input_select_left: "input.select.left",
  input_select_right: "input.select.right",
  input_select_up: "input.select.up",
  input_select_down: "input.select.down",
  input_line_home: "input.line.home",
  input_line_end: "input.line.end",
  input_select_line_home: "input.select.line.home",
  input_select_line_end: "input.select.line.end",
  input_visual_line_home: "input.visual.line.home",
  input_visual_line_end: "input.visual.line.end",
  input_select_visual_line_home: "input.select.visual.line.home",
  input_select_visual_line_end: "input.select.visual.line.end",
  input_buffer_home: "input.buffer.home",
  input_buffer_end: "input.buffer.end",
  input_select_buffer_home: "input.select.buffer.home",
  input_select_buffer_end: "input.select.buffer.end",
  input_delete_line: "input.delete.line",
  input_delete_to_line_end: "input.delete.to.line.end",
  input_delete_to_line_start: "input.delete.to.line.start",
  input_backspace: "input.backspace",
  input_delete: "input.delete",
  input_undo: "input.undo",
  input_redo: "input.redo",
  input_word_forward: "input.word.forward",
  input_word_backward: "input.word.backward",
  input_select_word_forward: "input.select.word.forward",
  input_select_word_backward: "input.select.word.backward",
  input_delete_word_forward: "input.delete.word.forward",
  input_delete_word_backward: "input.delete.word.backward",
  input_select_all: "input.select.all",
  history_previous: "prompt.history.previous",
  history_next: "prompt.history.next",
  terminal_suspend: "terminal.suspend",
  terminal_title_toggle: "terminal.title.toggle",
  tips_toggle: "tips.toggle",
  plugin_manager: "plugins.list",
  plugin_install: "plugins.install",
  which_key_toggle: "which-key.toggle",
  which_key_layout_toggle: "which-key.layout.toggle",
  which_key_pending_toggle: "which-key.pending.toggle",
  which_key_group_previous: "which-key.group.previous",
  which_key_group_next: "which-key.group.next",
  which_key_scroll_up: "which-key.scroll.up",
  which_key_scroll_down: "which-key.scroll.down",
  which_key_page_up: "which-key.page.up",
  which_key_page_down: "which-key.page.down",
  which_key_home: "which-key.home",
  which_key_end: "which-key.end",
} satisfies BindingCommandMap
const CommandDescriptions = Object.fromEntries(
  Object.entries(Definitions).map(([name, item]) => [
    CommandMap[name as keyof typeof CommandMap] ?? name,
    item.description,
  ]),
) as Record<string, string>

/**
 * Resolve a stored keybind `description` (now an i18n key like
 * `tui.keybind.<name>`) into translated text using the caller's translator.
 * Values that are not keybind keys (e.g. user overrides with raw text) are
 * returned unchanged. Pass the keybind `name` so the `session_quick_switch_N`
 * slot can be interpolated as `{{n}}`.
 */
export function resolveKeybindDescription(
  description: string,
  t: (key: string, params?: I18nParams) => string,
  name?: string,
) {
  if (description.startsWith("tui.keybind.")) {
    const params: I18nParams | undefined =
      name && /^session_quick_switch_\d$/.test(name) ? { n: Number(name.slice(-1)) } : undefined
    return t(description, params)
  }
  return description
}

/** Reverse of `CommandMap`: maps a command string back to its keybind name. */
export const CommandToName: Record<string, KeybindName> = Object.fromEntries(
  Object.entries(CommandMap).map(([name, command]) => [command, name as KeybindName]),
)

/**
 * Resolve the description for a command using the caller's translator. Looks
 * up the keybind name via `CommandToName` (needed to interpolate the
 * `session_quick_switch_N` slot), then translates the stored i18n key.
 */
export function resolveCommandDescription(
  command: string,
  t: (key: string, params?: I18nParams) => string,
) {
  const name = CommandToName[command] as KeybindName | undefined
  const description = name ? Descriptions[name] : CommandDescriptions[command]
  return description ? resolveKeybindDescription(description, t, name) : undefined
}

export type Keybinds = { [K in KeybindName]: BindingValueSchema }
export type KeybindOverrides = Partial<Keybinds>
export type BindingLookupView = {
  readonly bindings: readonly Binding<Renderable, KeyEvent>[]
  get(command: string): readonly Binding<Renderable, KeyEvent>[]
  has(command: string): boolean
  gather(name: string, commands: readonly string[]): readonly Binding<Renderable, KeyEvent>[]
  pick(name: string, commands: readonly string[]): Binding<Renderable, KeyEvent>[]
  omit(name: string, commands: readonly string[]): Binding<Renderable, KeyEvent>[]
}

export function toBindingConfig(keybinds: Keybinds): BindingConfig<Renderable, KeyEvent> {
  return Object.fromEntries(Object.entries(keybinds)) as BindingConfig<Renderable, KeyEvent>
}

const decodeBindingValue = Schema.decodeUnknownSync(BindingValueSchema)

export function defaultValue(name: KeybindName) {
  return Definitions[name].default
}

export function parse(keybinds: KeybindOverrides): Keybinds {
  const invalid = unknownKeys(keybinds)
  if (invalid.length) throw new Error(`Unrecognized keybind${invalid.length === 1 ? "" : "s"}: ${invalid.join(", ")}`)
  return Object.fromEntries(
    Object.entries(Definitions).map(([name, item]) => [
      name,
      decodeBindingValue(keybinds[name as KeybindName] ?? item.default),
    ]),
  ) as Keybinds
}

export const Keybinds = { parse }

export function unknownKeys(input: object) {
  return Object.keys(input).filter((key) => !KeybindNames.has(key))
}

export function bindingDefaults(): BindingDefaults<Renderable, KeyEvent> {
  return ({ command, binding }) => {
    if (binding.desc !== undefined) return
    return { desc: CommandDescriptions[command] }
  }
}

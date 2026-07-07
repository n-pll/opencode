import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createMemo, For, type Accessor } from "solid-js"
import { DEFAULT_THEMES, useTheme } from "../../context/theme"
import { useCommandShortcut } from "../../keymap"
import { useLanguage } from "../../context/language"

const themeCount = Object.keys(DEFAULT_THEMES).length

type TipPart = { text: string; highlight: boolean }
type TipShortcut = Accessor<string>
type Shortcuts = {
  agentCycle: TipShortcut
  childFirst: TipShortcut
  childNext: TipShortcut
  childPrevious: TipShortcut
  commandList: TipShortcut
  editorOpen: TipShortcut
  helpShow: TipShortcut
  inputClear: TipShortcut
  inputNewline: TipShortcut
  inputPaste: TipShortcut
  inputUndo: TipShortcut
  leader: TipShortcut
  messagesCopy: TipShortcut
  messagesFirst: TipShortcut
  messagesLast: TipShortcut
  messagesPageDown: TipShortcut
  messagesPageUp: TipShortcut
  messagesToggleConceal: TipShortcut
  modelCycleRecent: TipShortcut
  modelList: TipShortcut
  sessionExport: TipShortcut
  sessionInterrupt: TipShortcut
  sessionList: TipShortcut
  sessionNew: TipShortcut
  sessionParent: TipShortcut
  sessionPinToggle: TipShortcut
  sessionQuickSwitch1: TipShortcut
  sessionQuickSwitch9: TipShortcut
  sessionSidebarToggle: TipShortcut
  sessionTimeline: TipShortcut
  statusView: TipShortcut
  terminalSuspend: TipShortcut
  themeList: TipShortcut
}
type T = (key: string, params?: Record<string, string | number | boolean>) => string
type Tip = (shortcuts: Shortcuts, t: T) => string | undefined

function parse(tip: string): TipPart[] {
  const parts: TipPart[] = []
  const regex = /\{highlight\}(.*?)\{\/highlight\}/g
  const found = Array.from(tip.matchAll(regex))
  const state = found.reduce(
    (acc, match) => {
      const start = match.index ?? 0
      if (start > acc.index) {
        acc.parts.push({ text: tip.slice(acc.index, start), highlight: false })
      }
      acc.parts.push({ text: match[1], highlight: true })
      acc.index = start + match[0].length
      return acc
    },
    { parts, index: 0 },
  )

  if (state.index < tip.length) {
    parts.push({ text: tip.slice(state.index), highlight: false })
  }

  return parts
}

const NO_MODELS_PARTS = parse("Run {highlight}/connect{/highlight} to add an AI provider and start coding")

function shortcutText(value: string) {
  return `{highlight}${value}{/highlight}`
}

function commandText(command: string, shortcut: string) {
  if (!shortcut) return shortcutText(command)
  return `${shortcutText(command)} or ${shortcutText(shortcut)}`
}

function press(shortcut: string, actionKey: string, t: T) {
  if (!shortcut) return undefined
  return t("tui.tips.helper.press", { shortcut: shortcutText(shortcut), action: t(actionKey) })
}

/** Build a "Use <command> to <action>" tip; picks command_or/command_only based on shortcut availability. */
function useTip(command: string, shortcut: string, actionKey: string, t: T) {
  const action = t(actionKey)
  if (!shortcut) return t("tui.tips.helper.command_only", { command: shortcutText(command), action })
  return t("tui.tips.helper.command_or", {
    command: shortcutText(command),
    shortcut: shortcutText(shortcut),
    action,
  })
}

function configShortcut(api: TuiPluginApi, command: string): TipShortcut {
  return () =>
    api.tuiConfig.keybinds
      .get(command)
      .map((binding) => api.keys.formatSequence(Array.from(api.keymap.parseKeySequence(binding.key))))
      .filter(Boolean)
      .join(", ")
}

export function Tips(props: { api: TuiPluginApi; connected?: boolean }) {
  const theme = useTheme().theme
  const { t } = useLanguage()
  const noModelsTip = () => t("tui.tips.no_models")
  const tipOffset = Math.random()
  const shortcuts: Shortcuts = {
    agentCycle: useCommandShortcut("agent.cycle"),
    childFirst: configShortcut(props.api, "session.child.first"),
    childNext: configShortcut(props.api, "session.child.next"),
    childPrevious: configShortcut(props.api, "session.child.previous"),
    commandList: useCommandShortcut("command.palette.show"),
    editorOpen: useCommandShortcut("prompt.editor"),
    helpShow: useCommandShortcut("help.show"),
    inputClear: useCommandShortcut("prompt.clear"),
    inputNewline: useCommandShortcut("input.newline"),
    inputPaste: useCommandShortcut("prompt.paste"),
    inputUndo: useCommandShortcut("input.undo"),
    leader: configShortcut(props.api, "leader"),
    messagesCopy: configShortcut(props.api, "messages.copy"),
    messagesFirst: configShortcut(props.api, "session.first"),
    messagesLast: configShortcut(props.api, "session.last"),
    messagesPageDown: configShortcut(props.api, "session.page.down"),
    messagesPageUp: configShortcut(props.api, "session.page.up"),
    messagesToggleConceal: configShortcut(props.api, "session.toggle.conceal"),
    modelCycleRecent: useCommandShortcut("model.cycle_recent"),
    modelList: useCommandShortcut("model.list"),
    sessionExport: configShortcut(props.api, "session.export"),
    sessionInterrupt: configShortcut(props.api, "session.interrupt"),
    sessionList: useCommandShortcut("session.list"),
    sessionNew: useCommandShortcut("session.new"),
    sessionParent: configShortcut(props.api, "session.parent"),
    sessionPinToggle: configShortcut(props.api, "session.pin.toggle"),
    sessionQuickSwitch1: useCommandShortcut("session.quick_switch.1"),
    sessionQuickSwitch9: useCommandShortcut("session.quick_switch.9"),
    sessionSidebarToggle: configShortcut(props.api, "session.sidebar.toggle"),
    sessionTimeline: configShortcut(props.api, "session.timeline"),
    statusView: useCommandShortcut("opencode.status"),
    terminalSuspend: useCommandShortcut("terminal.suspend"),
    themeList: useCommandShortcut("theme.switch"),
  }
  const tip = createMemo(() => {
    if (props.connected === false) return noModelsTip()
    const tips = [...TIPS, process.platform !== "win32" ? TERMINAL_SUSPEND_TIP : INPUT_UNDO_TIP].flatMap((item) => {
      const value = item(shortcuts, t)
      return value ? [value] : []
    })
    return tips[Math.floor(tipOffset * tips.length)] ?? noModelsTip()
  }, noModelsTip())
  // Solid can expose a memo's initial value while a pure computation is pending.
  const parts = createMemo(() => {
    const value = tip()
    if (typeof value === "string") return parse(value)
    return NO_MODELS_PARTS
  }, NO_MODELS_PARTS)

  return (
    <box flexDirection="row" maxWidth="100%">
      <text flexShrink={0} style={{ fg: theme.warning }}>
        {t("tui.tips.prefix")}{" "}
      </text>
      <text flexShrink={1} wrapMode="word">
        <For each={parts()}>
          {(part) => <span style={{ fg: part.highlight ? theme.text : theme.textMuted }}>{part.text}</span>}
        </For>
      </text>
    </box>
  )
}

const TIPS: Tip[] = [
  (_s, t) => t("tui.tips.at_files"),
  (_s, t) => t("tui.tips.shell_bang"),
  (s, t) => press(s.agentCycle(), "tui.tips.action.cycle_agents", t),
  (_s, t) => t("tui.tips.undo"),
  (_s, t) => t("tui.tips.redo"),
  (_s, t) => t("tui.tips.share"),
  (_s, t) => t("tui.tips.drag_drop"),
  (s, t) => press(s.inputPaste(), "tui.tips.action.paste_images", t),
  (s, t) => useTip("/editor", s.editorOpen(), "tui.tips.action.compose_editor", t),
  (_s, t) => t("tui.tips.init"),
  (s, t) => useTip("/models", s.modelList(), "tui.tips.action.switch_models", t),
  (s, t) =>
    s.themeList()
      ? t("tui.tips.helper.command_or", {
          command: shortcutText("/themes"),
          shortcut: shortcutText(s.themeList()),
          action: t("tui.tips.action.switch_themes", { count: themeCount }),
        })
      : t("tui.tips.helper.command_only", {
          command: shortcutText("/themes"),
          action: t("tui.tips.action.switch_themes", { count: themeCount }),
        }),
  (s, t) => useTip("/new", s.sessionNew(), "tui.tips.action.new_session", t),
  (s, t) => useTip("/sessions", s.sessionList(), "tui.tips.action.list_sessions", t),
  (s, t) => press(s.sessionPinToggle(), "tui.tips.action.pin_session", t),
  (s, t) =>
    s.sessionQuickSwitch1() && s.sessionQuickSwitch9()
      ? t("tui.tips.pinned_quick_slots", {
          first: shortcutText(s.sessionQuickSwitch1()),
          last: shortcutText(s.sessionQuickSwitch9()),
        })
      : undefined,
  (_s, t) => t("tui.tips.compact"),
  (s, t) => useTip("/export", s.sessionExport(), "tui.tips.action.export_markdown", t),
  (s, t) => press(s.messagesCopy(), "tui.tips.action.copy_last_message", t),
  (s, t) => press(s.commandList(), "tui.tips.action.see_commands", t),
  (_s, t) => t("tui.tips.connect_providers"),
  (s, t) => t("tui.tips.leader_key", { leader: shortcutText(s.leader()) }),
  (s, t) => press(s.modelCycleRecent(), "tui.tips.action.cycle_recent_models", t),
  (s, t) => press(s.sessionSidebarToggle(), "tui.tips.action.toggle_sidebar", t),
  (s, t) =>
    s.messagesPageUp() && s.messagesPageDown()
      ? t("tui.tips.page_nav", { up: shortcutText(s.messagesPageUp()), down: shortcutText(s.messagesPageDown()) })
      : undefined,
  (s, t) => press(s.messagesFirst(), "tui.tips.action.jump_to_first", t),
  (s, t) => press(s.messagesLast(), "tui.tips.action.jump_to_last", t),
  (s, t) => press(s.inputNewline(), "tui.tips.action.add_newlines", t),
  (s, t) => press(s.inputClear(), "tui.tips.action.clear_input", t),
  (s, t) => press(s.sessionInterrupt(), "tui.tips.action.stop_response", t),
  (_s, t) => t("tui.tips.plan_agent"),
  (_s, t) => t("tui.tips.subagents"),
  (s, t) => {
    const items = [s.sessionParent(), s.childFirst(), s.childPrevious(), s.childNext()].filter(Boolean)
    if (!items.length) return undefined
    return t("tui.tips.parent_child_nav", { items: items.map(shortcutText).join(" / ") })
  },
  (_s, t) => t("tui.tips.opencode_json"),
  (_s, t) => t("tui.tips.tui_json_global"),
  (_s, t) => t("tui.tips.schema_autocomplete"),
  (_s, t) => t("tui.tips.config_model"),
  (_s, t) => t("tui.tips.config_keybinds"),
  (_s, t) => t("tui.tips.keybind_disable"),
  (_s, t) => t("tui.tips.config_mcp"),
  (_s, t) => t("tui.tips.custom_commands"),
  (_s, t) => t("tui.tips.command_args"),
  (_s, t) => t("tui.tips.command_shell"),
  (_s, t) => t("tui.tips.custom_agents"),
  (_s, t) => t("tui.tips.agent_permissions"),
  (_s, t) => t("tui.tips.bash_allow"),
  (_s, t) => t("tui.tips.bash_deny"),
  (_s, t) => t("tui.tips.bash_ask"),
  (_s, t) => t("tui.tips.formatter_enable"),
  (_s, t) => t("tui.tips.formatter_disable"),
  (_s, t) => t("tui.tips.formatter_custom"),
  (_s, t) => t("tui.tips.lsp_enable"),
  (_s, t) => t("tui.tips.custom_tools"),
  (_s, t) => t("tui.tips.tool_scripts"),
  (_s, t) => t("tui.tips.custom_plugins"),
  (_s, t) => t("tui.tips.plugins_notify"),
  (_s, t) => t("tui.tips.plugins_block_files"),
  (_s, t) => t("tui.tips.cli_run"),
  (_s, t) => t("tui.tips.cli_continue"),
  (_s, t) => t("tui.tips.cli_attach_file"),
  (_s, t) => t("tui.tips.cli_format_json"),
  (_s, t) => t("tui.tips.cli_serve"),
  (_s, t) => t("tui.tips.cli_run_attach"),
  (_s, t) => t("tui.tips.cli_upgrade"),
  (_s, t) => t("tui.tips.cli_auth_list"),
  (_s, t) => t("tui.tips.cli_agent_create"),
  (_s, t) => t("tui.tips.gh_mention"),
  (_s, t) => t("tui.tips.gh_install"),
  (_s, t) => t("tui.tips.gh_fix"),
  (_s, t) => t("tui.tips.gh_review"),
  (_s, t) => t("tui.tips.theme_system"),
  (_s, t) => t("tui.tips.theme_files"),
  (_s, t) => t("tui.tips.theme_variants"),
  (_s, t) => t("tui.tips.theme_xterm"),
  (_s, t) => t("tui.tips.env_syntax"),
  (_s, t) => t("tui.tips.file_syntax"),
  (_s, t) => t("tui.tips.instructions"),
  (_s, t) => t("tui.tips.temperature"),
  (_s, t) => t("tui.tips.steps"),
  (_s, t) => t("tui.tips.disable_tool"),
  (_s, t) => t("tui.tips.disable_mcp"),
  (_s, t) => t("tui.tips.per_agent_tools"),
  (_s, t) => t("tui.tips.share_auto"),
  (_s, t) => t("tui.tips.share_disabled"),
  (_s, t) => t("tui.tips.unshare"),
  (_s, t) => t("tui.tips.doom_loop"),
  (_s, t) => t("tui.tips.external_directory"),
  (_s, t) => t("tui.tips.debug_config"),
  (_s, t) => t("tui.tips.print_logs"),
  (s, t) => useTip("/timeline", s.sessionTimeline(), "tui.tips.action.jump_to_message", t),
  (s, t) => press(s.messagesToggleConceal(), "tui.tips.action.toggle_conceal", t),
  (s, t) => useTip("/status", s.statusView(), "tui.tips.action.system_status", t),
  (_s, t) => t("tui.tips.scroll_acceleration"),
  (s, t) =>
    s.commandList()
      ? t("tui.tips.username_toggle_shortcut", { shortcut: shortcutText(s.commandList()) })
      : t("tui.tips.username_toggle"),
  (_s, t) => t("tui.tips.docker"),
  (_s, t) => t("tui.tips.connect_zen"),
  (_s, t) => t("tui.tips.agents_md"),
  (_s, t) => t("tui.tips.review"),
  (s, t) => useTip("/help", s.helpShow(), "tui.tips.action.show_help", t),
  (_s, t) => t("tui.tips.rename"),
]

const INPUT_UNDO_TIP: Tip = (s, t) => press(s.inputUndo(), "tui.tips.action.input_undo", t)
const TERMINAL_SUSPEND_TIP: Tip = (s, t) => press(s.terminalSuspend(), "tui.tips.action.suspend_terminal", t)

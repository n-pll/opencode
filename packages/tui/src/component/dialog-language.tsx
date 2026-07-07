import { createMemo, type JSX } from "solid-js"
import { DialogSelect } from "../ui/dialog-select"
import { useDialog } from "../ui/dialog"
import { useLanguage, type TuiLocale } from "../context/language"

export function DialogLanguage() {
  const dialog = useDialog()
  const language = useLanguage()

  const options = createMemo(() =>
    language.locales.map((locale) => ({
      title: language.label(locale),
      value: locale,
      onSelect: () => {
        language.setLocale(locale)
        dialog.clear()
      },
    })),
  )

  const current = createMemo<TuiLocale>(() => language.locale())

  return <DialogSelect<TuiLocale> title={language.t("tui.command.language.switch.title")} options={options()} current={current()} skipFilter />
}

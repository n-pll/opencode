import { useLanguage } from "../context/language"
import type { LocationRef } from "@opencode-ai/sdk/v2"
import { createContext, useContext, type Accessor, type ParentProps } from "solid-js"

const context = createContext<Accessor<LocationRef | undefined>>()

export function LocationProvider(props: ParentProps<{ location?: LocationRef }>) {
  return <context.Provider value={() => props.location}>{props.children}</context.Provider>
}

export function useLocation() {
  const { t } = useLanguage()
  const value = useContext(context)
  if (!value) throw new Error(t("tui.location.location-context-must-be-used-within-a-locationprovider"))
  return value
}

import { Panel } from "@/features/panel";
import { createContext, PropsWithChildren, useContext } from "react";

type StaticPanel = Pick<Panel, "id">;

const PanelContext = createContext<StaticPanel | null>(null);

export function PanelProvider({
  panel,
  children,
}: PropsWithChildren & { panel: StaticPanel }) {
  return (
    <PanelContext.Provider value={panel}>{children}</PanelContext.Provider>
  );
}

export function usePanelContext() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error("usePanelContext must be used within a PanelProvider");
  }
  return context;
}

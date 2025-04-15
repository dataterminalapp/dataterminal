import { Tab } from "@/features/tabs";
import { createContext, PropsWithChildren, useContext } from "react";

type StaticTab = Pick<Tab, "id">;

const TabContext = createContext<StaticTab | null>(null);

export function TabProvider({
  tab,
  children,
}: PropsWithChildren & { tab: StaticTab }) {
  return <TabContext.Provider value={tab}>{children}</TabContext.Provider>;
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error("useTabContext must be used within a TabProvider");
  }
  return context;
}

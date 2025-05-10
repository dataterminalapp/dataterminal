import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useRedux";
import { usePanelContext } from "@/contexts/panel";
import DatabaseErrorAnimation from "@/components/sections/explorer/errorAnimation";
import BrowserTable from "./table";
import Header from "./header";
import { useTabContext } from "@/contexts/tab";
import { BrowserProvider } from "@/contexts/browser";

const TableBrowser = () => {
  const { id: tabId } = useTabContext();
  const { id: panelId } = usePanelContext();

  /**
   * Selectors / memo
   */
  const connectionIds = useAppSelector((state) => state.connections.ids);
  const results = useAppSelector(
    (state) => state.results.idsByPanelId[panelId]
  );
  const [resultId] = useMemo(
    () => (results ? Object.keys(results) : []),
    [results]
  );
  const tab = useAppSelector((state) => state.tabs.entities[tabId]);
  const error = useAppSelector(
    (state) => state.results.entities[resultId]?.error
  );
  const connection = tab.options.browser?.connection;

  const isConnectionDeleted =
    typeof connectionIds.find((x) => x === connection?.id) === "undefined";

  return (
    <BrowserProvider>
      <Header resultId={resultId} isConnectionDeleted={isConnectionDeleted} />
      {error && (
        <DatabaseErrorAnimation
          className="w-96 mx-auto"
          errorMessage={error.message}
        />
      )}
      <BrowserTable />
    </BrowserProvider>
  );
};

export default TableBrowser;

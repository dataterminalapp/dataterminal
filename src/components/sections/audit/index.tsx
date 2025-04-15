import { useCallback, useMemo } from "react";
import { useAppSelector } from "@/hooks/useRedux";
import { usePanelContext } from "@/contexts/panel";
import DatabaseErrorAnimation from "@/components/sections/explorer/errorAnimation";
import Log from "./log";
import Search from "../explorer/search";
import { useFocusContext } from "@/contexts/focus";

const Audit = () => {
  /**
   * Contexts
   */
  const { id: panelId } = usePanelContext();
  const { setFocus } = useFocusContext();

  /**
   * Selectors
   */
  const results = useAppSelector(
    (state) => state.results.idsByPanelId[panelId]
  );
  const [resultId] = useMemo(
    () => (results ? Object.keys(results) : []),
    [results]
  );
  const error = useAppSelector(
    (state) => state.results.entities[resultId]?.error
  );

  /**
   * Callbacks
   */
  const handleOnSearchFocus = useCallback(() => {
    setFocus("audit", "search", {
      from: "audit/handleOnSearchFocus",
    });
  }, [setFocus]);

  return (
    /**
     * Try to always match explorer padding.
     */
    <div className="container h-full max-h-full overflow-hidden flex flex-col gap-3 p-2 md:px-10 lg:px-16 xl:px-20 2xl:px-24">
      <Search
        description="Filter logs"
        shortcut={["F"]}
        onFocus={handleOnSearchFocus}
        autoFocus
      />
      {error && (
        <DatabaseErrorAnimation
          className="w-96 mx-auto"
          errorMessage={error.message}
        />
      )}
      {resultId && <Log resultId={resultId} />}
    </div>
  );
};

export default Audit;

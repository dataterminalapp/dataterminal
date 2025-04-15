import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import { historyIndexIncreased, historyIndexDecreased } from "@/features/panel";

/**
 * Custom hook to manage history navigation within the app.
 *
 * Increase and decrease are usually triggered by the terminal editor keyboard's up and down shortcuts.
 */
const useHistoryNavigation = (panelId: string) => {
  const dispatch = useAppDispatch();
  const historyIndex = useAppSelector(
    (state) => state.panels.entities[panelId].historyIndex
  );
  const focusedResultId = useAppSelector((state) => {
    return typeof historyIndex === "number"
      ? state.panels.entities[panelId].resultIds[
          state.panels.entities[panelId].resultIds.length - historyIndex - 1
        ]
      : undefined;
  });

  const increaseHistoryIndex = useCallback(() => {
    dispatch(historyIndexIncreased({ id: panelId }));
  }, [dispatch, historyIndexIncreased, panelId]);

  const decreaseHistoryIndex = useCallback(() => {
    dispatch(historyIndexDecreased({ id: panelId }));
  }, [dispatch, historyIndexDecreased, panelId]);

  return useMemo(
    () => ({
      increaseHistoryIndex,
      decreaseHistoryIndex,
      focusedResultId,
    }),
    [increaseHistoryIndex, decreaseHistoryIndex, focusedResultId]
  );
};

export default useHistoryNavigation;

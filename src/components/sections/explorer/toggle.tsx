import React, { MouseEventHandler, useCallback } from "react";
import SmallTooltip from "../../utils/SmallTooltip";
import { useFocusContext } from "@/contexts/focus";
import { toggle } from "@/features/explorer";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { preventDefault, handleFocusFallback } from "../../utils";

const Toggle = () => {
  const dispatch = useAppDispatch();
  const enabled = useAppSelector((state) => state.explorer.enabled);
  const currentTabId = useAppSelector((state) => state.focus.tabId);
  const currentTab = useAppSelector((state) =>
    currentTabId ? state.tabs.entities[currentTabId] : undefined
  );
  const connectionIds = useAppSelector((state) => state.connections.ids);
  const { setFocus } = useFocusContext();

  const onTitleClick: MouseEventHandler = useCallback(
    (e) => {
      preventDefault(e);
      dispatch(toggle());

      if (enabled && currentTab) {
        handleFocusFallback(
          connectionIds,
          currentTab,
          setFocus,
          "explorer/onTitleClick"
        );
      }
    },
    [dispatch, toggle, enabled, currentTab, connectionIds, setFocus]
  );

  return (
    <SmallTooltip description={"Collapse"} delayDuration={300}>
      <h1
        onClick={onTitleClick}
        className="text-muted-foreground ml-1 hover:text-primary"
      >
        Explore
      </h1>
    </SmallTooltip>
  );
};

export default Toggle;

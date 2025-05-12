import { cn } from "@/lib/utils";
import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  MouseEventHandler,
} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import ManageConnections from "../../sections/connections/manage";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import BoardKey from "../../utils/shortcuts/boardKey";
import Panel from "../panels";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { toggle } from "@/features/explorer";
import { initialTabAdded, Tab, tabRemoved, TabType } from "@/features/tabs";
import { focusChanged } from "@/features/focus";
import { initialPanelAdded, multiplePanelsRemoved } from "@/features/panel";
import { panelResultsRemoved } from "@/features/result";
import { Dispatch } from "@reduxjs/toolkit";
import { useFocusContext } from "@/contexts/focus";
import {
  handleFocusFallback,
  preventDefaultAndStopPropagation,
} from "@/components/utils";
import { TabProvider, useTabContext } from "@/contexts/tab";
import { PanelProvider } from "@/contexts/panel";
import {
  CodeIcon,
  CubeIcon,
  DashboardIcon,
  EyeOpenIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  TableIcon,
} from "@radix-ui/react-icons";
import { BaseEntityType } from "@/features/schema";
import Audit from "@/components/sections/audit";
import Preferences from "@/components/sections/preferences";
import Browser from "@/components/sections/browser";
import { XMarkIcon } from "@heroicons/react/24/outline";

export const AuditIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      className={cn("text-muted-foreground size-4 ml-2 mr-3", className)}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 10.5V6.8c0-1.68 0-2.52-.327-3.162a3 3 0 00-1.311-1.311C17.72 2 16.88 2 15.2 2H8.8c-1.68 0-2.52 0-3.162.327a3 3 0 00-1.311 1.311C4 4.28 4 5.12 4 6.8v10.4c0 1.68 0 2.52.327 3.162a3 3 0 001.311 1.311C6.28 22 7.12 22 8.8 22h2.7M22 22l-1.5-1.5m1-2.5a3.5 3.5 0 11-7 0 3.5 3.5 0 017 0z"
      />
    </svg>
  );
};

export const IconByTabType = ({
  tabType,
  entityType,
  className,
}: {
  tabType: TabType;
  entityType?: BaseEntityType;
  className?: string;
}) => {
  switch (tabType) {
    case "Browser":
      if (entityType === BaseEntityType.Table) {
        return <TableIcon className={className} />;
      } else if (entityType === BaseEntityType.View) {
        return <EyeOpenIcon className={className} />;
      } else {
        return <MagnifyingGlassIcon className={className} />;
      }

    case "Connections":
      return <CubeIcon className={className} />;

    case "Results":
      return <CodeIcon className={className} />;

    case "Audit":
      return <AuditIcon className={className} />;

    case "Dashboards":
      return <DashboardIcon className={className} />;

    case "Preferences":
      return <MixerHorizontalIcon className={className} />;
  }
};

export const handleRemoveTab = ({
  tabId,
  tabs,
  currentTabId,
  tabIds,
  panelIds,
  dispatch,
}: {
  tabId: string;
  currentTabId: string | undefined;
  tabs: Record<string, Tab>;
  tabIds: Array<string>;
  panelIds: Array<string>;
  dispatch: Dispatch;
}) => {
  if (!tabId || !tabIds || tabIds.length === 0 || !panelIds) return;

  // Double op. Improve this.
  // Improve multiple removes, JOIN structures inside states..
  const newTabIds = tabIds.filter((id) => id !== tabId);
  panelIds.forEach((panelId) => {
    dispatch(panelResultsRemoved({ panelId }));
    (window as Window).electronAPI.removePanelClient(panelId);
  });
  dispatch(multiplePanelsRemoved({ ids: panelIds }));

  dispatch(tabRemoved({ id: tabId }));
  const newIndex = tabIds.indexOf(tabId) > 0 ? tabIds.indexOf(tabId) - 1 : 0;

  const tabIdFocused = newTabIds[newIndex] || null;
  // Change focus only if the current tab is the one removed.
  if (tabIdFocused && currentTabId === tabId) {
    dispatch(
      focusChanged({
        tabId: tabIdFocused,
        panelId: tabs[tabIdFocused]?.options.panelIds[0],
      })
    );
  }
};

interface Props {
  num: string;
  tabId: string;
  focus: boolean;
}

export const TabTriggerContent = ({ focus, num, tabId }: Props) => {
  /**
   * Contexts
   */
  const { setFocus, restoreFocus } = useFocusContext();
  const dispatch = useAppDispatch();

  /**
   * Refs
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Selectors
   */
  const currentTabId = useAppSelector((state) => state.focus.tabId);
  const tab = useAppSelector((state) => state.tabs.entities[tabId]);
  const tabs = useAppSelector((state) => state.tabs.entities);
  const tabIds = useAppSelector((state) => state.tabs.ids);
  const panelIds = useAppSelector(
    (state) => state.tabs.entities[tabId].options.panelIds
  );

  /**
   * States
   */
  const [showShortcut, setShowShortcut] = useState(true);
  const { name, id } = tab;
  const [tabName] = useState(name);
  const entityName = tab.options.browser?.entity?.name;
  const entityType = tab.options.browser?.entity?.type;
  const tooltipOpen = focus ? undefined : false;
  const value = entityName ? entityName : tabName;
  const widthInCharts = value.length;

  /**
   * Memos
   */
  const tabIndex = useMemo(() => {
    return tabIds.findIndex((id) => id === tab.id) + 1;
  }, [tabIds, tab.id]);

  /**
   * Callbacks
   */
  const handleOnTabCloseClick: MouseEventHandler<HTMLButtonElement> =
    useCallback(
      (e) => {
        preventDefaultAndStopPropagation(e);
        handleRemoveTab({
          tabId,
          currentTabId,
          tabIds,
          dispatch,
          panelIds,
          tabs,
        });
        restoreFocus("tabs/handleOnTabCloseClick");
      },
      [dispatch, tabIds, panelIds, currentTabId, tabs]
    );

  const handleOnTabShortcutBoardKey = useCallback(() => {
    dispatch(focusChanged({ tabId, panelId: panelIds[0] }));
    setFocus("editor", "input", { from: "tabs/handleOnTabShortcutBoardKey" });
  }, [dispatch, focusChanged, setFocus, tabId, panelIds]);

  const onMouseDown: MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.button === 1) {
        preventDefaultAndStopPropagation(e);
        handleRemoveTab({
          tabId,
          currentTabId,
          tabIds,
          dispatch,
          panelIds,
          tabs,
        });
        restoreFocus("tabs/handleOnTabCloseMouseDown");
      }
    },
    [dispatch, tabIds, panelIds, currentTabId, tabs]
  );

  const onTooltipTriggerMouseDown: MouseEventHandler<HTMLButtonElement> =
    useCallback(
      (e) => {
        preventDefaultAndStopPropagation(e);
        if (e.button === 1) {
          handleRemoveTab({
            tabId,
            currentTabId,
            tabIds,
            dispatch,
            panelIds,
            tabs,
          });
          restoreFocus("tabs/handleOnTabCloseMouseDown");
        }
      },
      [dispatch, tabIds, panelIds, currentTabId, tabs]
    );

  /**
   * Effects
   */
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      if ((containerRef.current?.offsetWidth || 0) < 210) {
        setShowShortcut(false);
      } else {
        setShowShortcut(true);
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        className="relative py-2 flex items-center justify-center grow basis-auto"
      >
        <div className="flex flex-row gap-1 ml-8 w-fit truncate">
          <IconByTabType
            tabType={tab.type}
            entityType={entityType}
            className="size-3.5 mt-0.5"
          />
          <p
            className={cn(
              "bg-transparent focus:outline-none truncate mr-4 font-normal"
            )}
            style={{ width: `${widthInCharts}ch` }}
          >
            {value}
          </p>
          {showShortcut && (
            <kbd className="absolute right-4 text-xs text-muted-foreground/50 hidden group-hover:block">
              ⌘ {tabIndex}
            </kbd>
          )}
        </div>
        <Tooltip open={tooltipOpen}>
          <TooltipTrigger
            id={id}
            onClick={handleOnTabCloseClick}
            onMouseDown={onTooltipTriggerMouseDown}
            className="cursor-default p-0.5 hover:bg-muted-foreground/20 rounded z-20 left-2 absolute flex items-center w-fit h-fit opacity-0 group-hover:opacity-100"
          >
            <XMarkIcon className="size-3" />
          </TooltipTrigger>
          <TooltipContent className="flex flex-row gap-2 text-xs">
            <p>Close tab</p> <BoardKey characters={["⌘", "W"]}></BoardKey>
          </TooltipContent>
        </Tooltip>
      </div>
      <DetectBoardKey
        id={id}
        meta
        boardKey={num}
        onKeyPress={handleOnTabShortcutBoardKey}
      />
    </>
  );
};

export const TabsHeader = (): JSX.Element => {
  const { setFocus } = useFocusContext();
  const dispatch = useAppDispatch();
  const tabIdFocused = useAppSelector((state) => state.focus.tabId);
  const tabs = useAppSelector((state) => state.tabs.ids);
  const currentTab = useAppSelector((state) =>
    tabIdFocused ? state.tabs.entities[tabIdFocused] : undefined
  );
  const explorerFocused = useAppSelector(
    (state) => state.focus.currentFocus?.area === "explorer"
  );

  const handleOnTabClick: React.MouseEventHandler<HTMLButtonElement> =
    useCallback(
      (e) => {
        dispatch(
          focusChanged({
            tabId: e.currentTarget.id,
          })
        );
        setFocus("editor", "input", { from: "tabsHeader/handleOnTabClick" });
      },
      [dispatch, focusChanged, setFocus]
    );

  if (tabs.length > 1) {
    return (
      <TabsList
        tabIndex={-1}
        className="bg-card p-0 h-fit w-full top-0 z-20 sticky rounded-none"
      >
        {tabs.map((id, i) => (
          <TabsTrigger
            className={cn(
              "transition-none group rounded-none relative w-full h-7 bg-background border border-t-0 data-[state=active]:bg-panel",
              "data-[state=active]:border-b-0 border-b-border/50 border-x-border/50 data-[state=active]:border-t border-l-0",
              explorerFocused
                ? "data-[state=active]:border-t-green-900"
                : "data-[state=active]:border-t-green-700",
              i === tabs.length - 1 &&
                "border-r-0 data-[state=active]:border-r-0 data-[state=inactive]:border-r-0 rounded-tr-lg rounded-b-none data-[state=active]:rounded-t-none",
              i === 0 &&
                "data-[state=active]:border-l-0 rounded-tl-lg rounded-b-none data-[state=active]:rounded-t-none",
              "data-[state=inactive]:bg-panel/70 data-[state=inactive]:shadow-inner data-[state=inactive]:shadow-black/15",
              "data-[state=inactive]:hover:bg-panel/50 data-[state=inactive]:hover:border-t",
              "border cursor-default"
            )}
            onClick={handleOnTabClick}
            key={id}
            id={id}
            value={id}
          >
            <TabTriggerContent
              num={(i + 1).toString()}
              tabId={id}
              focus={(currentTab && currentTab.id) === id}
            />
          </TabsTrigger>
        ))}
      </TabsList>
    );
  } else {
    return <></>;
  }
};

const TabBodyByType = (): JSX.Element => {
  const { id } = useTabContext();
  const tab = useAppSelector((state) => state.tabs.entities[id]);
  const panelId = useAppSelector(
    (state) => state.tabs.entities[id].options.panelIds[0]
  );

  switch (tab.type) {
    case "Connections":
      return <ManageConnections />;
    case "Results":
      return (
        <PanelProvider panel={{ id: panelId }}>
          <Panel key={`panel_${id}`} />
          {/* <Chat /> */}
        </PanelProvider>
      );
    case "Browser":
      return (
        <PanelProvider panel={{ id: panelId }}>
          <Browser />
        </PanelProvider>
      );
    case "Audit":
      return (
        <PanelProvider panel={{ id: panelId }}>
          <Audit />
        </PanelProvider>
      );
    case "Preferences":
      return <Preferences />;
    default:
      return <></>;
  }
};

export const TabsBody = (): JSX.Element => {
  const ids = useAppSelector((state) => state.tabs.ids);
  const dispatch = useAppDispatch();
  const explorer = useAppSelector((state) => state.explorer.enabled);
  const currentTabId = useAppSelector((state) => state.focus.tabId);
  const currentTab = useAppSelector((state) =>
    currentTabId ? state.tabs.entities[currentTabId] : undefined
  );
  const connectionIds = useAppSelector((state) => state.connections.ids);
  const { setFocus } = useFocusContext();

  const handleOnKeyPress = useCallback(() => {
    dispatch(toggle());

    if (explorer && currentTab) {
      handleFocusFallback(
        connectionIds,
        currentTab,
        setFocus,
        "tabsBody/handleOnKeyPress"
      );
    }
  }, [dispatch, toggle, explorer, currentTab, connectionIds]);

  return (
    <>
      {ids.map((id) => (
        <TabProvider tab={{ id }} key={`tab_${id}_provider`}>
          <TabsContent
            key={`tab_${id}_content`}
            value={id}
            className={cn("group bg-panel h-full max-h-full overflow-y-auto")}
            tabIndex={-1}
          >
            <DetectBoardKey meta boardKey="b" onKeyPress={handleOnKeyPress} />
            <TabBodyByType />
          </TabsContent>
        </TabProvider>
      ))}
    </>
  );
};

const TabComponent = () => {
  const dispatch = useAppDispatch();
  const tabIds = useAppSelector((state) => state.tabs.ids);
  const layoutPreference = useAppSelector((state) => state.preferences.layout);
  const limitPreference = useAppSelector((state) => state.preferences.limit);
  const emptyTabs = tabIds && tabIds.length === 0;
  const tabId = useAppSelector((state) => state.focus.tabId);

  /**
   * Use a initial dispatch action to avoid double rendering effect.
   */
  useEffect(() => {
    if (emptyTabs) {
      const panelAddedResult = dispatch(
        initialPanelAdded({
          layout: layoutPreference || "Terminal",
          limit: typeof limitPreference === "boolean" ? limitPreference : true,
        })
      );
      const tabAddedResult = dispatch(
        initialTabAdded("Results", {
          panelIds: [panelAddedResult.payload.id],
        })
      );
      dispatch(
        focusChanged({
          tabId: tabAddedResult.payload.id,
          panelId: panelAddedResult.payload.id,
        })
      );
    }
  }, [emptyTabs, layoutPreference, limitPreference]);

  return (
    <>
      {/* H-FULL */}
      <Tabs
        value={tabId}
        className="flex flex-col rounded-lg h-full max-h-full overflow-hidden bg-panel"
      >
        <TabsHeader />
        <TabsBody />
      </Tabs>
    </>
  );
};

export default TabComponent;

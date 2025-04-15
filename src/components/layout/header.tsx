import { cn } from "@/lib/utils";
import { MouseEventHandler, useCallback } from "react";
import { PanelBottom, PanelLeft, PlusIcon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { tabAdded } from "@/features/tabs";
import { layoutToggled, panelAdded } from "@/features/panel";
import { useFocusContext } from "@/contexts/focus";
import SmallTooltip from "../utils/SmallTooltip";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import BoardKey from "../utils/shortcuts/boardKey";
import { SearchDialog } from "./searchDialog";
import {
  handleFocusFallback,
  preventDefaultAndStopPropagation,
} from "../utils";
import { toggle } from "@/features/explorer";
import { focusChanged } from "@/features/focus";
import { searchOpenChanged } from "@/features/global";
import { Squares2X2Icon } from "@heroicons/react/24/outline";

const Header = ({ className }: { className: string }) => {
  const dispatch = useAppDispatch();
  const explorer = useAppSelector((state) => state.explorer.enabled);
  const { setFocus } = useFocusContext();
  const currentTabId = useAppSelector((state) => state.focus.tabId);
  const currentPanelId = useAppSelector((state) => state.focus.panelId);
  const currentLayout = useAppSelector(
    (state) => currentPanelId && state.panels.entities[currentPanelId]?.layout
  );
  const currentTab = useAppSelector((state) =>
    currentTabId ? state.tabs.entities[currentTabId] : undefined
  );
  const connectionIds = useAppSelector((state) => state.connections.ids);
  const connectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );
  const connection = useAppSelector(
    (state) => connectionId && state.connections.entities[connectionId]
  );
  const currentSchemaName = useAppSelector(
    (state) => state.workspace.schema.current
  );
  const schema = useAppSelector((state) =>
    currentSchemaName
      ? state.schema.schemas.entities[currentSchemaName]
      : undefined
  );
  const schemas = useAppSelector((state) => state.schema.schemas.entities);
  const searchPath = useAppSelector((state) => state.workspace.searchPath);
  const preferedLayout = useAppSelector((state) => state.preferences.layout);
  const preferedLimit = useAppSelector((state) => state.preferences.limit);

  const onAddTabClick = useCallback(() => {
    const panelId = dispatch(
      panelAdded({ layout: preferedLayout, limit: preferedLimit })
    );
    dispatch(tabAdded("Results", { panelIds: [panelId.payload.id] }));
  }, [preferedLayout, preferedLimit]);

  const onToggleExplorerClick = useCallback(() => {
    dispatch(toggle());

    if (explorer && currentTab) {
      handleFocusFallback(
        connectionIds,
        currentTab,
        setFocus,
        "explorer/onToggleExplorerClick"
      );
    }
  }, [explorer, currentTab, connectionIds, setFocus]);

  const onToggleLayoutClick = useCallback(() => {
    if (currentPanelId) {
      dispatch(
        layoutToggled({
          id: currentPanelId,
        })
      );
    }
  }, [currentPanelId]);

  const onBrowserOpen: MouseEventHandler = useCallback(
    (e) => {
      preventDefaultAndStopPropagation(e);

      const schema = Object.values(schemas).find((x) =>
        searchPath?.includes(x.name)
      );
      if (connection && schema) {
        const panelAddedResult = dispatch(
          panelAdded({ layout: "Terminal", limit: false })
        );
        const tabAddedResult = dispatch(
          tabAdded("Browser", {
            browser: {
              connection,
              entity: schema,
            },
            panelIds: [panelAddedResult.payload.id],
          })
        );
        dispatch(
          focusChanged({
            tabId: tabAddedResult.payload.id,
            panelId: tabAddedResult.payload.options.panelIds[0],
          })
        );
      }
      dispatch(searchOpenChanged(false));
    },
    [dispatch, connection, schemas, searchPath]
  );

  return (
    <div className={cn(className, "draggable top-0 w-full grid grid-cols-3")}>
      <div className="draggable"></div>
      <div className="draggable flex items-center">
        <div
          className={cn(
            "w-[250px] h-7 border border-border/30 p-1 flex flex-row text-muted-foreground items-center max-w-full rounded-xl bg-panel m-auto",
            "focus-visible:outline-none focus-visible:ring-0",
            "hover:border-border transition-all",
            "overflow-hidden",
            "ring-0 outline-none",
            "text-muted-foreground/50"
          )}
        >
          <SearchDialog>
            <div className="hover:text-primary flex items-center w-full group">
              <MagnifyingGlassIcon className="shrink-0 size-4 ml-1" />
              <p className="mx-2 text-left truncate flex-1">Search</p>
              <BoardKey
                variant="minimal"
                className="ml-auto mr-1 mt-1 shrink-0 hidden min-[450px]:block group-hover:opacity-100 opacity-0"
                characters={["⌘", "P"]}
              />
            </div>
          </SearchDialog>
          <div className="w-[1px] h-full my-2 bg-muted mx-1 shrink-0"></div>
          <button
            className="shrink-0 text-muted-foreground/50 pl-1.5 pr-1 hover:text-primary disabled:cursor-not-allowed"
            onClick={onBrowserOpen}
            disabled={!connection || !schema}
          >
            <Squares2X2Icon className="size-4" />
          </button>
        </div>
      </div>
      <div className="draggable h-full w-full flex items-center gap-2">
        <div className="w-full draggable flex">&nbsp;</div>
        <SmallTooltip
          disableHoverableContent
          description={"Toggle layout"}
          shortcut={["⌘", "E"]}
          onClick={onToggleLayoutClick}
          className={cn("group p-0.5 hover:bg-muted-foreground/20 rounded")}
          disabled
        >
          <PanelBottom
            className={cn(
              "size-4 text-muted-foreground group-hover:stroke-primary",
              currentLayout === "IDE" &&
                "outline-none focus:outline-none text-foreground",
              // Temporarily disabled
              "hidden"
            )}
          />
        </SmallTooltip>
        <SmallTooltip
          disableHoverableContent
          description={"Toggle explorer"}
          shortcut={["⌘", "B"]}
          onClick={onToggleExplorerClick}
          className={cn("group p-0.5 hover:bg-muted-foreground/20 rounded")}
        >
          <PanelLeft
            className={cn(
              "size-4 stroke-muted-foreground group-hover:stroke-primary",
              explorer && "outline-none focus:outline-none stroke-foreground"
            )}
          />
        </SmallTooltip>
        <SmallTooltip
          disableHoverableContent
          description={"Add tab"}
          shortcut={["⌘", "T"]}
          onClick={onAddTabClick}
          className="p-0.5 hover:bg-accent rounded group"
        >
          <PlusIcon
            className={cn(
              "size-4 stroke-muted-foreground group-hover:stroke-primary"
            )}
          />
        </SmallTooltip>
      </div>
    </div>
  );
};

export default Header;

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { usePanelContext } from "@/contexts/panel";
import { CodeIcon, MixerHorizontalIcon, StopIcon } from "@radix-ui/react-icons";
import { PropsWithChildren, useCallback, useEffect } from "react";
import {
  charactersSelectedChanged,
  layoutToggled,
  // analyzeModeToggled,
  limitChanged,
  queriesSelectedChanged,
} from "@/features/panel";
import { useFocusContext } from "@/contexts/focus";
import { ChevronRight, EllipsisVertical, Play } from "lucide-react";
import * as monaco from "monaco-editor";
import { splitQueries } from "./utils";
import { preventDefaultAndStopPropagation } from "../../utils";
import SmallTooltip from "../../utils/SmallTooltip";
import { APIResponse } from "@/services/types";
import { tabAdded } from "@/features/tabs";
import { focusChanged } from "@/features/focus";
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

interface Props extends PropsWithChildren {
  open?: boolean;
}

export const RunDropdown = ({ children, open }: Props) => {
  const { id: panelId } = usePanelContext();
  const { setFocus } = useFocusContext();
  // const analyzeMode = useAppSelector(
  //   (state) => state.panels.entities[panelId].analyzeMode
  // );
  const limit = useAppSelector((state) => state.panels.entities[panelId].limit);
  const layout = useAppSelector(
    (state) => state.panels.entities[panelId].layout
  );
  const dispatch = useAppDispatch();

  const onCloseAutoFocus = useCallback((e: Event) => {
    preventDefaultAndStopPropagation(e);
    setFocus("editor", "input", {
      from: "editor/run/onCloseAutoFocus",
    });
  }, []);

  // const onAnalyzeSelected = useCallback(() => {
  //   dispatch(analyzeModeToggled({ id: panelId }));
  // }, [dispatch, panelId]);

  const onLimitSelected = useCallback(() => {
    dispatch(limitChanged({ id: panelId, limit: true }));
  }, [dispatch, panelId]);
  const onNoLimitSelected = useCallback(() => {
    dispatch(limitChanged({ id: panelId, limit: false }));
  }, [dispatch, panelId]);

  const onLayoutToggle = useCallback(() => {
    dispatch(layoutToggled({ id: panelId }));
  }, [dispatch, panelId]);

  const onPreferencesSelect = useCallback(() => {
    const tabAddedResults = dispatch(tabAdded("Preferences"));
    dispatch(focusChanged({ tabId: tabAddedResults.payload.id }));
  }, []);

  return (
    <DropdownMenu open={open}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={onCloseAutoFocus}
        className="text-muted-foreground"
      >
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup value={limit === true ? "LIMIT" : "NO_LIMIT"}>
          <DropdownMenuRadioItem value={"LIMIT"} onSelect={onLimitSelected}>
            <ShieldCheckIcon className="size-4 ml-2 mr-3" />
            Limit 100
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"NO_LIMIT"}
            onSelect={onNoLimitSelected}
          >
            <ShieldExclamationIcon className="size-4 ml-2 mr-3" />
            No limit
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup value={layout}>
          <DropdownMenuRadioItem
            value={"IDE"}
            onSelect={layout === "IDE" ? undefined : onLayoutToggle}
          >
            <CodeIcon className="size-4 ml-2 mr-3" />
            Editor
            {layout === "Terminal" && (
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            )}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            value={"Terminal"}
            onSelect={layout === "IDE" ? onLayoutToggle : undefined}
          >
            <ChevronRight className="size-4 ml-2 mr-3" />
            Terminal
            {layout === "IDE" && (
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            )}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onPreferencesSelect}>
          <MixerHorizontalIcon className="size-4 ml-2 mr-3" />
          Preferences
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Run = ({
  editor,
  handleRunQuery,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  handleRunQuery: (useSelection?: boolean) => void;
}) => {
  const { id: panelId } = usePanelContext();
  const dispatch = useAppDispatch();
  const analyzeMode = useAppSelector(
    (state) => state.panels.entities[panelId].analyzeMode
  );
  const loading = useAppSelector(
    (state) => state.panels.entities[panelId].loading
  );
  // const limit = useAppSelector((state) => state.panels.entities[panelId].limit);
  const queriesSelected = useAppSelector(
    (state) => state.panels.entities[panelId].queriesSelected
  );

  useEffect(() => {
    if (editor) {
      editor.onDidChangeCursorSelection(() => {
        const model = editor.getModel();
        const selection = editor.getSelection();

        // If no selection or no model, immediately set to undefined
        if (!selection || !model) {
          return;
        }

        const content = model.getValueInRange(selection);
        const trimmedInput = content.trim();

        dispatch(
          charactersSelectedChanged({
            id: panelId,
            charactersSelected: content.length > 0 ? content.length : undefined,
          })
        );

        // If no content after trimming, set to undefined
        if (!trimmedInput) {
          dispatch(
            queriesSelectedChanged({ id: panelId, queriesSelected: undefined })
          );
          return;
        }

        try {
          const queries = splitQueries(trimmedInput);
          dispatch(
            queriesSelectedChanged({
              id: panelId,
              queriesSelected: queries.length,
            })
          );
        } catch (err) {
          console.error("Error splitting queries: ", err);
        }
      });
    }
  }, [editor]);

  const handleOnClick = useCallback(() => {
    if (loading) {
      const asyncOp = async () => {
        try {
          const { error }: APIResponse<{ canceled: boolean }, Error> = await (
            window as Window
          ).electronAPI.cancelQuery(panelId);
          if (error) {
            console.error("Error canceling query: ", error);
          }
        } catch (err) {
          console.error("Error canceling query: ", err);
        }
      };
      asyncOp();
    } else {
      handleRunQuery(typeof queriesSelected === "number" ? true : false);
    }
  }, [handleRunQuery, queriesSelected, loading]);

  return (
    <div className="absolute bottom-4 right-6 z-20">
      <div className="relative flex">
        {queriesSelected && (
          <div
            className={cn(
              "absolute -top-5 -left-4 bg-green-600 hover:bg-green-500 text-panel rounded-full size-6 flex items-center text-center truncate",
              analyzeMode && "bg-orange-600 hover:bg-orange-500"
            )}
            data-testid="ide-queries-selected-amount"
          >
            <span className="m-auto truncate">{queriesSelected}</span>
          </div>
        )}
        <SmallTooltip
          asChild
          description={queriesSelected ? "Run selected queries" : "Run all"}
          shortcut={queriesSelected ? ["⌘", "⏎"] : undefined}
        >
          <button
            onClick={handleOnClick}
            className={cn(
              "size-8 lg:size-10 relative shadow shadow-black/20 transition-transform z-10 gap-2 rounded-2xl rounded-r-none flex px-2 items-center bg-green-600 hover:bg-green-500",
              analyzeMode && "bg-orange-600 hover:bg-orange-500"
            )}
            data-testid="ide-run-button"
          >
            <StopIcon
              className={cn(
                "absolute left-3 xl:left-1 fill-panel bg-panel stroke-panel size-2.5 m-auto inset-0 duration-300 transition-opacity",
                loading ? "opacity-100 scale-100" : "opacity-0 scale-75"
              )}
            />
            <Play
              className={cn(
                "absolute left-3 xl:left-4 fill-panel stroke-panel size-3.5 m-auto duration-300 transition-opacity",
                loading
                  ? "opacity-0 scale-75 rotate-90"
                  : "opacity-100 scale-100"
              )}
            />
          </button>
        </SmallTooltip>
        <RunDropdown>
          <button
            disabled={loading}
            tabIndex={-1}
            className={cn(
              "h-8 lg:h-10 rounded-2xl rounded-l-none px-2 bg-green-600 text-panel hover:bg-green-500 relative",
              analyzeMode && "bg-orange-600 hover:bg-orange-500"
            )}
            data-testid="ide-preferences-button"
          >
            <EllipsisVertical className="size-4 stroke-1" />
          </button>
        </RunDropdown>
      </div>
    </div>
  );
};

export default Run;

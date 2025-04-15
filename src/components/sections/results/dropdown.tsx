import { MouseEventHandler, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import { ChartNoAxesColumnIcon, ChevronRightIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { resultRemoved, searchFilterEnabled } from "@/features/result";
import {
  chartDialogChanged,
  historyIndexDecreased,
  resultRemoved as panelResultRemoved,
} from "@/features/panel";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import useQuery from "@/hooks/useQuery";
import { useFocusContext } from "@/contexts/focus";
import { preventDefaultAndStopPropagation } from "@/components/utils";
import { useResultContext } from "@/contexts/result";
import {
  MagnifyingGlassIcon,
  ReloadIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { isResultChartable } from "../chart/builder";

const Dropdown = () => {
  const { id, sql, panelId, error } = useResultContext();
  const { setFocus, restoreFocus } = useFocusContext();
  const isFocused = useAppSelector((state) => {
    const historyIndex = state.panels.entities[panelId]?.historyIndex;
    if (typeof historyIndex === "number") {
      return (
        state.panels.entities[panelId]?.resultIds[
          state.panels.entities[panelId]?.resultIds.length - historyIndex - 1
        ] === id
      );
    } else {
      return undefined;
    }
  });
  const dispatch = useAppDispatch();
  const [openDropdown, setOpenDropdown] = useState(false);
  const { userQuery } = useQuery({ panelId });
  const data = useAppSelector((state) => state.results.entities[id].data);
  const containerRef = useRef<HTMLDivElement>(null);
  const notice = data && data.notice;
  const warning = notice?.severity === "WARNING";
  const isLayoutTerminal = useAppSelector(
    (state) => state.panels.entities[panelId].layout === "Terminal"
  );

  const handleOnRunAgainQuery = useCallback(() => {
    userQuery(sql, {
      skipInputUpdate: !isLayoutTerminal,
    });
  }, [userQuery, sql, isLayoutTerminal]);

  const handleOnChart = useCallback(() => {
    dispatch(
      chartDialogChanged({
        id: panelId,
        chart: {
          open: true,
          resultId: id,
        },
      })
    );
  }, [panelId, id]);

  const handleOnOpenChange = useCallback((open: boolean) => {
    setOpenDropdown(open);
  }, []);

  const handleOnEscapeKeyPress = useCallback(() => {
    setOpenDropdown(false);
  }, []);

  const handleOnRemoveResultShortcutKey = useCallback(() => {
    dispatch(panelResultRemoved({ panelId, resultId: id }));
    dispatch(resultRemoved({ id, panelId }));

    // It is important to decrease the index. Otherwise will fail to set
    // the correect focus after removing the oldest result.
    dispatch(historyIndexDecreased({ id: panelId }));
    setFocus("editor", "input", {
      from: "Dropdown/handleOnRemoveResultShortcutKey",
    });
  }, [dispatch, resultRemoved, panelId, id, panelResultRemoved]);

  const handleOnSearchClick: MouseEventHandler = useCallback(() => {
    dispatch(searchFilterEnabled({ id }));
    setFocus("result", "search", { id, from: "dropdown/handleOnSearchClick" });
  }, [setFocus, dispatch, id, searchFilterEnabled]);

  // const handleOnPagination = useCallback(() => {
  //   setFocus("result", "pagination", {
  //     id,
  //     from: "dropdown/handleOnPagination",
  //   });
  // }, [setFocus, id]);

  /**
   * Disable auto focus after closing the dropdown.
   * This is very important, otherwise the dropdown will
   * regain the focus aggresively after closing the modal.
   * This breaks behaviors like focusing the search, pagination
   * or editor inputs.
   */
  const onCloseAutoFocus = useCallback(
    (e: Event) => {
      preventDefaultAndStopPropagation(e);
      restoreFocus("dropdown/onCloseAutoFocus");
    },
    [restoreFocus]
  );

  return (
    <div className={cn("w-fit self-start")} ref={containerRef}>
      {openDropdown && (
        <DetectBoardKey
          boardKey="Escape"
          preventDefault
          stopPropagation
          onKeyPress={handleOnEscapeKeyPress}
        />
      )}
      {
        <DetectBoardKey
          meta
          boardKey="Delete"
          preventDefault
          stopPropagation
          onKeyPress={handleOnRemoveResultShortcutKey}
        />
      }
      <DropdownMenu onOpenChange={handleOnOpenChange} open={openDropdown}>
        <DropdownMenuTrigger
          tabIndex={-1}
          className={cn(
            "group hover:bg-accent h-fit w-fit p-0.5 rounded-sm rounded-l-none border border-input border-l-0",
            "outline-none data-[state='open']:bg-accent transition-all",
            error && "border-red-900 data-[state='open']:bg-red-950",
            warning && "border-yellow-800 data-[state='open']:bg-yellow-800",
            isFocused && "bg-neutral-800/80 border-green-500",
            isFocused && error && "border-red-500",
            isFocused && warning && "border-yellow-500"
          )}
          onClick={preventDefaultAndStopPropagation}
        >
          <ChevronRightIcon
            className={cn(
              "size-3.5 stroke-muted-foreground self-start transition-all outline-none",
              "group-data-[state='open']:rotate-90 group-data-[state='open']:stroke-primary",
              error && "group-data-[state='open']:stroke-red-700",
              warning && "",
              isFocused && "stroke-accent-foregroundt"
            )}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          onCloseAutoFocus={onCloseAutoFocus}
          className="w-64 text-muted-foreground bg-panel"
        >
          <DropdownMenuItem onClick={handleOnRunAgainQuery}>
            <ReloadIcon className="size-3 ml-2 mr-3" />
            Run again
            <DropdownMenuShortcut hidden={!isLayoutTerminal}>
              Enter
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          {isResultChartable({ error, warning, rows: data?.rows }) && (
            <DropdownMenuItem onClick={handleOnChart}>
              <ChartNoAxesColumnIcon className="size-4 ml-2 mr-3" />
              Chart
              <DropdownMenuShortcut hidden={!isLayoutTerminal}>
                ⌘G
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )}
          {/* Disabled temp. */}
          {/* {!error && !warning && paginationEnabled && (
            <DropdownMenuItem onClick={handleOnPagination}>
              <ButtonIcon className="size-4 ml-2 mr-3" />
              Pagination
              <DropdownMenuShortcut hidden={!isLayoutTerminal}>
                ⌘N
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )} */}
          {!error && !warning && (
            <DropdownMenuItem onClick={handleOnSearchClick}>
              <MagnifyingGlassIcon className="size-4 ml-2 mr-3" />
              Search{" "}
              <DropdownMenuShortcut hidden={!isLayoutTerminal}>
                ⌘F
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleOnRemoveResultShortcutKey}>
            <TrashIcon className="size-4 ml-2 mr-3" />
            Remove
            <DropdownMenuShortcut hidden={!isLayoutTerminal}>
              ⌘←
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default Dropdown;

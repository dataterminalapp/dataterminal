import React, {
  FocusEventHandler,
  useCallback,
  useEffect,
  useRef,
} from "react";
import "./resizer.css";

import { cn } from "@/lib/utils";
import Search from "@/components/sections/explorer/search";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { searchFilterDisabled, searchFilterUpdated } from "@/features/result";
import { useFocusContext } from "@/contexts/focus";
import { useResultContext } from "@/contexts/result";
import { preventDefaultAndStopPropagation } from "../utils";

export function TableSearch({
  preview,
  className,
}: {
  className?: string;
  preview?: boolean;
}) {
  const { id: resultId } = useResultContext();
  const { setFocus, register, getCurrentFocus } = useFocusContext();
  const searchFilter = useAppSelector(
    (state) => state.results.entities[resultId].uiState.searchFilter
  );
  const enabled = useAppSelector(
    (state) => state.results.entities[resultId].uiState.searchFilterEnabled
  );
  const dispatch = useAppDispatch();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      register("result", "search", ref.current, { id: resultId });
    }
  }, [ref.current, register]);

  useEffect(() => {
    if (enabled && ref.current) {
      const currentFocus = getCurrentFocus();
      if (
        currentFocus?.id === resultId &&
        currentFocus.area === "result" &&
        currentFocus.target === "search"
      ) {
        ref.current.focus();
        ref.current.select();
      }

      if (
        (ref.current.value === undefined || ref.current.value === "") &&
        searchFilter
      ) {
        ref.current.value = searchFilter;
      }
    }
  }, [enabled, ref.current]);

  const handleOnKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const value = String(ref.current?.value);
      if (e.key === "Enter") {
        // table.setGlobalFilter(value);
        if ((!searchFilter && value !== "") || (searchFilter && !value)) {
          // table.setPageIndex(0);
        }
        dispatch(searchFilterUpdated({ id: resultId, searchFilter: value }));
        preventDefaultAndStopPropagation(e);
      } else if (e.key === "Escape") {
        setFocus("editor", "input", { from: "searchInput/handleOnKeyDown" });
        if (!value) {
          dispatch(
            searchFilterUpdated({ id: resultId, searchFilter: undefined })
          );
          dispatch(searchFilterDisabled({ id: resultId }));
          if (searchFilter) {
            // table.setGlobalFilter(undefined);
            // table.setPageIndex(0);
          }
        }
        preventDefaultAndStopPropagation(e);
      }
    },
    [ref.current, setFocus, dispatch, searchFilter, searchFilterUpdated]
  );

  const handleOnBlur: FocusEventHandler = useCallback(
    (e) => {
      if (!searchFilter && e.relatedTarget) {
        // table.setGlobalFilter(null);
        dispatch(
          searchFilterUpdated({ id: resultId, searchFilter: undefined })
        );
        dispatch(searchFilterDisabled({ id: resultId }));
      }

      /**
       * This happens for example when the user presses ALT + TAB, and the focus ends nowhere.
       * Return the focus back.
       */
      if (!e.relatedTarget) {
        preventDefaultAndStopPropagation(e);
        setFocus("result", "search", {
          id: resultId,
          from: "table/search/handleOnBlur",
        });
      }

      // Do not use setFocus here, otherwise if the focus goes to other places,
      // like the Search in opening panel, it will drive the focus to the editor.
      // setFocus("editor", "input", { from: "SearchInput/handleOnBlur"});
    },
    [dispatch, searchFilter, searchFilterUpdated, resultId]
  );

  const handleOnClick = useCallback(() => {
    ref.current?.focus();
  }, [ref.current]);

  return (
    <Search
      size="sm"
      ref={ref}
      onBlur={handleOnBlur}
      onKeyDown={handleOnKeyDown}
      onFocus={() => {}}
      hidden={!enabled && !preview}
      onClick={handleOnClick}
      defaultValue={searchFilter}
      className={cn(
        "h-6 w-fit pt-0 pl-0 transition-opacity",
        // This is needed because the search icon is absolute
        preview && "min-w-7",
        !enabled && !preview ? "pointer-events-none opacity-0" : "opacity-100",
        className
      )}
      description={"Search table"}
      shortcut={["⌘", "F"]}
    />
  );
}

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./resizer.css";
import { cn, formatLatencyorTiming, formatRowCount } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useFocusContext } from "@/contexts/focus";
import { useResultContext } from "@/contexts/result";
import "@glideapps/glide-data-grid/dist/index.css";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import DataEditor, {
  Item,
  GridCell,
  GridCellKind,
  GridColumn,
  GridKeyEventArgs,
  Theme,
  Rectangle,
  EditableGridCell,
  GridMouseEventArgs,
  GetRowThemeCallback,
  GridSelection,
} from "@glideapps/glide-data-grid";
import { FieldDef } from "pg";
import { TableSearch } from "./search";
import { useTableFuseSearch } from "@/hooks/useTableFuseSearch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useSortedData } from "@/hooks/useSortedData";
import {
  resultColumnSizeChanged,
  resultEditedDataChanged,
  resultRegionVisibleChanged,
  resultSortChanged,
  searchFilterEnabled,
} from "@/features/result";
import {
  DataEditorRef,
  RowMarkerOptions,
} from "@glideapps/glide-data-grid/dist/dts/data-editor/data-editor";
import { chartDialogChanged } from "@/features/panel";
import { preventDefaultAndStopPropagation } from "../utils";

interface TableProps {
  columns: Array<FieldDef>;
  data: Array<Array<unknown>>;
  className?: string;
  fullHeight?: boolean;
  hideTiming?: boolean;
  hideRowsCount?: boolean;
  previewSearch?: boolean;
  editable?: boolean;
  dense?: boolean;
  limited?: boolean;
  rowMarkers?:
    | "number"
    | RowMarkerOptions
    | "checkbox"
    | "clickable-number"
    | "checkbox-visible"
    | "both"
    | "none"
    | undefined;
  onGridSelectionChange?: (gridSelection: GridSelection) => void;
}

export const DEFAULT_ROWS_PER_PAGE = 10;

export function Table({
  data: initialRows,
  className,
  previewSearch,
  hideTiming,
  hideRowsCount,
  rowMarkers,
  dense,
  fullHeight,
  editable,
  limited,
  onGridSelectionChange: propsOnGridSelectionChange,
}: TableProps) {
  /**
   * Hooks
   */
  const { id: resultId } = useResultContext();
  const editedData = useAppSelector(
    (state) => state.results.entities[resultId]?.editedData
  );
  const initialData = editedData?.rows || initialRows;
  const filteredData = useTableFuseSearch(initialData);
  const data = useSortedData(filteredData);
  const { setFocus, updateFocusedTable } = useFocusContext();
  const dispatch = useAppDispatch();

  /**
   * Refs
   */
  const containerRef = useRef<HTMLDivElement>(null);
  const tableEditorRef = useRef<DataEditorRef>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * Selectors
   */
  const baseColumns = useAppSelector(
    (state) => state.results.entities[resultId].uiState.columns || []
  );
  const panelId = useAppSelector(
    (state) => state.results.entities[resultId]?.panelId
  );
  const sort = useAppSelector(
    (state) => state.results.entities[resultId]?.uiState.sort
  );
  const isFocused = useAppSelector((state) => {
    const historyIndex = state.panels.entities[panelId]?.historyIndex;
    if (typeof historyIndex === "number") {
      return (
        state.panels.entities[panelId]?.resultIds[
          state.panels.entities[panelId]?.resultIds.length - historyIndex - 1
        ] === resultId
      );
    } else {
      return undefined;
    }
  });

  /**
   * States
   */
  const [selectedColumn, setSelectedColumn] = useState<undefined | number>();
  const [isOpen, setIsOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState<number | undefined>(undefined);
  const [gridSelection, setGridSelection] = useState<GridSelection | undefined>(
    undefined
  );

  /**
   * Memos
   */
  const theme: Partial<Theme> = useMemo((): Partial<Theme> => {
    return {
      bgCell: "#19191C",
      bgHeader: "#19191C",
      bgHeaderHovered: "#19191C",
      bgHeaderHasFocus: "#19191C",
      borderColor: "#27272A",
      textDark: "#DADADA",
      textLight: "#DADADA",
      accentColor: "#16a34a",
      headerFontStyle: "12px",
      baseFontStyle: "12px",
      fontFamily: "'IBM Plex Mono'",
      textHeader: "#959595",
      headerBottomBorderColor: "#27272A",
      bgBubbleSelected: "#959595",
      accentLight: "#29292C",
    };
  }, []);
  const columnHeight = useMemo(() => 24, []);
  const columns = useMemo(() => {
    if (sort) {
      const { type } = sort;
      if (type) {
        return baseColumns.map((x, index) => ({
          ...x,
          title:
            selectedColumn === index
              ? baseColumns[index].title + (type === "desc" ? " ↓" : " ↑")
              : baseColumns[index].title,
        }));
      }
    }
    return baseColumns;
  }, [baseColumns, sort]);

  /**
   * Effects
   */
  useEffect(() => {
    if (isFocused && tableEditorRef.current && containerRef.current) {
      updateFocusedTable(tableEditorRef.current, containerRef.current);
    }
  }, [isFocused, resultId]);

  /**
   * Callbacks
   */
  const onItemHovered = useCallback((args: GridMouseEventArgs) => {
    const [, row] = args.location;
    setHoverRow(args.kind !== "cell" ? undefined : row);
  }, []);

  const getRowThemeOverride = useCallback<GetRowThemeCallback>(
    (row) => {
      if (row !== hoverRow) return undefined;
      return {
        bgCell: "#29292C",
      };
    },
    [hoverRow]
  );

  const onColumnResize = useCallback(
    (column: GridColumn, newSize: number) =>
      dispatch(
        resultColumnSizeChanged({
          column,
          newSize,
          id: resultId,
        })
      ),
    [resultId]
  );

  const getData = useCallback(
    ([col, row]: Item): GridCell => {
      const value = data[row][col];
      if (typeof value === "string") {
        return {
          kind: GridCellKind.Text,
          data: value,
          allowOverlay: editable || false,
          readonly: false,
          displayData: value,
        };
      } else {
        const val = value === null ? String(value) : JSON.stringify(value);
        return {
          kind: GridCellKind.Text,
          data: val,
          allowOverlay: editable || false,
          readonly: false,
          style: value === null ? "faded" : "normal",
          displayData: val,
        };
      }
    },
    [data]
  );

  const handleOnKeyDown = useCallback(
    (e: GridKeyEventArgs) => {
      if (e.key === "Escape") {
        setFocus("editor", "input", { from: "table/dataEditor" });
      } else if (e.key.toLowerCase() === "g" && e.metaKey) {
        preventDefaultAndStopPropagation(e);
        dispatch(
          chartDialogChanged({
            id: panelId,
            chart: {
              resultId,
              open: true,
            },
          })
        );
      } else if (e.key.toLocaleLowerCase() === "f" && e.metaKey) {
        preventDefaultAndStopPropagation(e);

        setFocus("result", "search", {
          id: resultId,
          from: "editor/focusResultSearch",
        });
        dispatch(searchFilterEnabled({ id: resultId }));
      }
    },
    [setFocus, resultId]
  );

  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell) => {
      if (newValue.kind !== GridCellKind.Text) {
        return;
      }
      const [col, row] = cell;
      dispatch(
        resultEditedDataChanged({
          id: resultId,
          edit: {
            col,
            row,
            newValue: newValue.data,
          },
        })
      );
    },
    [resultId]
  );

  const onHeaderMenuClick = useCallback((col: number, bounds: Rectangle) => {
    setIsOpen(false);
    setSelectedColumn(col);

    if (menuRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const adjustedX = bounds.x - containerRect.left;
      const adjustedY = bounds.y - containerRect.top;
      const { width, height } = bounds;

      menuRef.current.style.position = "absolute";
      menuRef.current.style.top = `${adjustedY + height + 2}px`;
      menuRef.current.style.left = `${
        adjustedX + width - menuRef.current.offsetWidth
      }px`;
      menuRef.current.style.zIndex = "1000";

      // Viewport boundary checks
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${adjustedX + width - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${adjustedY - rect.height - 2}px`;
      }

      setIsOpen(true);
    }
  }, []);

  const onGridSelectionChange = useCallback(
    (newSelection: GridSelection) => {
      setGridSelection(newSelection);
      if (propsOnGridSelectionChange) {
        propsOnGridSelectionChange(newSelection);
      }
    },
    [resultId, propsOnGridSelectionChange]
  );

  const onCheckedChange = useCallback(
    (selectedColumn?: number, type?: "asc" | "desc") => {
      if (typeof selectedColumn === "number") {
        dispatch(
          resultSortChanged({
            id: resultId,
            sort: type
              ? {
                  column: selectedColumn,
                  type,
                }
              : undefined,
          })
        );
      }
    },
    []
  );

  const onVisibleRegionChanged = useCallback(
    (range: Rectangle) => {
      dispatch(
        resultRegionVisibleChanged({ id: resultId, regionVisible: range.y })
      );
    },
    [resultId]
  );

  /**
   * We use 33, which is slightly less than the height of a single row.
   * This adjustment resolves the scrollbar issue.
   * Using a base height of 24 looks better when there is no overflow,
   * but if the table overflows, the scrollbar overlaps the last row.
   * To prevent this, we add extra space to fix the issue. The tradeoff is
   * that there will always be a small unused space at the bottom.
   */
  const height = useMemo(() => {
    if (limited) {
      if (data.length > 14) {
        return 345;
      } else {
        return 33 + data.length * columnHeight;
      }
    }
  }, [data, columnHeight, limited]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          className,
          "flex flex-col h-full relative overflow-hidden pr-2"
        )}
      >
        <div
          className="border border-border m-1 outline outline-border/30 outline-offset-2 w-fit max-w-full rounded-lg overflow-hidden"
          style={{ background: "#19191C" }}
        >
          <DataEditor
            ref={tableEditorRef}
            height={fullHeight ? undefined : height}
            initialSize={
              limited && height ? [columns.length * 200, height] : undefined
            }
            theme={theme}
            verticalBorder={false}
            className="rounded"
            rowMarkers={rowMarkers}
            columns={columns}
            getCellsForSelection={true}
            editOnType={false}
            rows={data.length}
            rowHeight={dense ? columnHeight : undefined}
            headerHeight={dense ? columnHeight : undefined}
            minColumnWidth={200}
            trapFocus
            smoothScrollX={true}
            smoothScrollY={true}
            gridSelection={gridSelection}
            onColumnResize={onColumnResize}
            onKeyDown={handleOnKeyDown}
            onHeaderMenuClick={onHeaderMenuClick}
            onCellEdited={onCellEdited}
            onItemHovered={onItemHovered}
            getRowThemeOverride={getRowThemeOverride}
            onGridSelectionChange={onGridSelectionChange}
            getCellContent={getData}
            onVisibleRegionChanged={onVisibleRegionChanged}
          />
        </div>

        <div className="h-8 rounded-b-sm shrink-0">
          <div className="text-muted-foreground absolute bottom-0 rounded-b-sm w-full">
            <div className="flex flex-row items-center">
              <TableSearch className="pt-1" preview={previewSearch} />
              {!hideTiming && <Timing className="pl-0.5" />}
              {!hideRowsCount && <RowsCount />}
            </div>
          </div>
        </div>

        <DropdownMenu
          open={isOpen}
          onOpenChange={(open) => !open && setIsOpen(false)}
        >
          <DropdownMenuTrigger asChild>
            <div ref={menuRef} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Sorting</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sort?.type === "asc" && sort?.column === selectedColumn}
              onCheckedChange={() => onCheckedChange(selectedColumn, "asc")}
            >
              Sort asc
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sort?.type === "desc" && sort?.column === selectedColumn}
              onCheckedChange={() => onCheckedChange(selectedColumn, "desc")}
            >
              Sort desc
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={!sort || sort.column !== selectedColumn || !sort.type}
              onCheckedChange={() => onCheckedChange(selectedColumn)}
            >
              No sort
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

const RowsCount = () => {
  const { id: resultId, timing, analyze } = useResultContext();
  const searchEnabled = useAppSelector(
    (state) => state.results.entities[resultId].uiState.searchFilterEnabled
  );
  const rowsCount = useAppSelector(
    (state) => state.results.entities[resultId].data?.rows.length
  );

  if (typeof timing === "number" && !analyze) {
    return (
      <div
        className={cn("pl-0.5 ml-1 truncate", searchEnabled ? "hidden" : "")}
      >
        <p
          className={cn("w-fit truncate text-muted-foreground/50")}
          style={{ fontSize: "11px" }}
        >
          {`(${formatRowCount(rowsCount || 0)})`}
        </p>
      </div>
    );
  } else {
    return <></>;
  }
};

export const Timing = ({ className }: { className?: string }) => {
  const { id: resultId, timing, error, analyze } = useResultContext();
  const searchEnabled = useAppSelector(
    (state) => state.results.entities[resultId].uiState.searchFilterEnabled
  );
  // Errors' have the timing inside the error itself.
  // This is because the exception removes the internal timing from the client.
  const consolidateTiming = typeof timing === "number" ? timing : error?.timing;

  if (typeof consolidateTiming === "number" && !analyze) {
    return (
      <div
        className={cn(
          "flex flex-row gap-2 items-center",
          searchEnabled ? "hidden" : "",
          className
        )}
      >
        <p
          className={cn("w-fit text-muted-foreground/50 font-mono")}
          style={{ fontSize: "11px" }}
        >
          {formatLatencyorTiming(consolidateTiming)}
        </p>
      </div>
    );
  } else {
    return <></>;
  }
};

import React, { useCallback, useMemo } from "react";
import ChartThemeButton, { ChartTheme } from "./themeButton";
import { cn, isNumericColumn } from "@/lib/utils";
import { ChartTypeRegistry } from "chart.js";
import { Button } from "@/components/ui/button";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { FieldDef } from "pg";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import DetectBoardKey from "@/components/utils/shortcuts/detectBoardKey";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import BoardKey from "@/components/utils/shortcuts/boardKey";
import { Label } from "@/components/ui/label";
import SmallTooltip from "@/components/utils/SmallTooltip";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { chartDialogChanged } from "@/features/panel";
import { usePanelContext } from "@/contexts/panel";
import {
  preventDefaultAndStopPropagation,
  stopPropagation,
} from "@/components/utils";
import { capitalizeFirstChar } from "@/components/sections/code/error";
import {
  resultChartAxisActiveChanged,
  resultChartChartThemeChanged,
  resultChartGroupByAxisChanged,
  resultChartThemeToggled,
  resultChartTypeChanged,
  resultChartXAxisChanged,
  resultChartYAxisChanged,
} from "@/features/result";
import { useResultContext } from "@/contexts/result";
import { useFocusContext } from "@/contexts/focus";

export const CLOSE_CHART_BUTTON_ID = "CANCEL_CHART_BUTTON_ID";

const ChartTypeSelect = ({
  value,
  className,
}: {
  value: keyof ChartTypeRegistry;
  className?: string;
}) => {
  const { id: resultId } = useResultContext();
  const dispatch = useAppDispatch();
  const chartTypes: Array<keyof ChartTypeRegistry> = ["bar", "line", "pie"];

  /**
   * States
   */
  const [open, setOpen] = React.useState(false);

  /**
   * Callbacks
   */
  const onChange = useCallback(
    (value: keyof ChartTypeRegistry) => {
      dispatch(resultChartTypeChanged({ id: resultId, type: value }));
      setOpen(false);
    },
    [resultChartTypeChanged]
  );

  const handleOnOpenShortcutPress = useCallback(() => {
    setOpen(true);
  }, []);

  const handleOnEscPress = useCallback(() => {
    setOpen(false);
  }, []);

  const handleOnOpenChange = useCallback((open: boolean) => {
    setOpen(open);
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOnOpenChange} modal={false}>
      <div className={cn("grid gap-2", className)}>
        <Label htmlFor={"visulization-select-type"}>Type</Label>
        {/* Stop propagation and prevent default, otherwise goes into the <CommandInput /> */}
        {!open && (
          <DetectBoardKey
            stopPropagation
            preventDefault
            boardKey={"t"}
            onKeyPress={handleOnOpenShortcutPress}
            area="chart"
            skipIfExplorerIsFocused
          />
        )}
        <div className="flex flex-row gap-2 items-center">
          <PopoverTrigger
            className={"outline-none bg-panel"}
            tabIndex={-1}
            asChild
          >
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between bg-transparent py-2 h-fit"
              id={"chart-select-trigger"}
            >
              {capitalizeFirstChar(value)}
              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          {<BoardKey characters={["T"]} variant="minimal" />}
        </div>
      </div>
      <PopoverContent
        className="p-0"
        side="bottom"
        align="start"
        onKeyDown={stopPropagation}
        onCloseAutoFocus={preventDefaultAndStopPropagation}
      >
        <Command className="z-60 bg-panel" inputMode="text">
          <CommandInput placeholder="Search chart type..." className="h-9 " />
          <CommandList>
            <CommandEmpty className="">No chart type found.</CommandEmpty>
            <CommandGroup>
              {chartTypes.map((_type) => (
                <CommandItem
                  key={_type}
                  value={_type}
                  onSelect={(value) =>
                    onChange(value as keyof ChartTypeRegistry)
                  }
                >
                  {capitalizeFirstChar(_type)}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === _type ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="h-fit p-2 pb-0.5 flex justify-between">
            <div className="flex flex-col w-fit">
              <div className="flex gap-2">
                <BoardKey characters={["↑"]} />
                <BoardKey characters={["↓"]} />
              </div>
              <div className="pt-1 text-muted-foreground text-center">
                Navigation
              </div>
            </div>
            <div className="flex flex-col w-fit ml-auto">
              <BoardKey characters={["Enter"]} />
              <div className="pt-1 text-muted-foreground text-center">
                Select
              </div>
            </div>
            <div className="flex flex-col w-fit ml-auto">
              <BoardKey characters={["esc"]} />
              <div className="pt-1 text-muted-foreground text-center">
                Close
              </div>
              {open && (
                <DetectBoardKey
                  stopPropagation
                  preventDefault
                  boardKey={"Escape"}
                  onKeyPress={handleOnEscPress}
                  skipIfExplorerIsFocused
                />
              )}
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface AxisSelectProps {
  columns?: Array<FieldDef>;
  value: number | undefined;
  className?: string;
  filterNumeric?: boolean;
  placeholder?: string;
  boardKey: string;
  axisActive: string | undefined;
  showShortcut: boolean;
  label: string;
  onAxisActive: (axis: string | undefined) => void;
  onValueChange: (columnIndex: number | undefined) => void;
}

const AxisSelect = ({
  axisActive,
  boardKey,
  columns,
  value,
  filterNumeric,
  showShortcut,
  placeholder,
  label,
  className,
  onValueChange,
  onAxisActive,
}: AxisSelectProps) => {
  const [open, setOpen] = React.useState(false);
  const onChange = useCallback((index: number | undefined) => {
    onValueChange(index);
    setOpen(false);
    onAxisActive(undefined);
  }, []);
  const filteredColumns = useMemo(() => {
    if (columns) {
      return filterNumeric
        ? columns
            .map((column, index) => ({ column, index }))
            .filter(({ column }) =>
              isNumericColumn(column.dataTypeID.toString())
            )
        : columns.map((column, index) => ({ column, index }));
    } else {
      return [];
    }
  }, [columns, filterNumeric]);

  const handleOnKeyPress = useCallback(() => {
    if (!axisActive) {
      // If the key is pressed, open, do not close.
      setOpen(true);
      onAxisActive(boardKey);
    }
  }, [axisActive, onAxisActive, boardKey]);

  const handleOnEscPress = useCallback(() => {
    setOpen(false);
    onAxisActive(undefined);
  }, [onAxisActive]);

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setOpen(open);
      if (open) {
        onAxisActive(boardKey);
      } else {
        onAxisActive(undefined);
      }
    },
    [onAxisActive, boardKey]
  );

  return (
    <Popover open={open} onOpenChange={handleOnOpenChange} modal={false}>
      <div className={cn("grid gap-2", className)}>
        <Label htmlFor={"axis-select-" + label} className="w-fit">
          {label}
        </Label>
        {/* Stop propagation and prevent default, otherwise goes into the <CommandInput /> */}
        {!axisActive && (
          <DetectBoardKey
            stopPropagation
            preventDefault
            boardKey={boardKey}
            onKeyPress={handleOnKeyPress}
            skipIfExplorerIsFocused
          />
        )}
        <div className="flex flex-row gap-2 items-center">
          <PopoverTrigger
            className={"outline-none bg-panel"}
            tabIndex={-1}
            asChild
          >
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between bg-transparent py-2 h-fit"
              id={"axis-select-" + label}
            >
              {typeof value === "number" && columns && columns[value]
                ? columns[value].name
                : placeholder}
              <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          {showShortcut && (
            <BoardKey characters={[boardKey.toUpperCase()]} variant="minimal" />
          )}
        </div>
      </div>
      <PopoverContent
        className="p-0"
        side="bottom"
        align="start"
        onKeyDown={stopPropagation}
        onCloseAutoFocus={preventDefaultAndStopPropagation}
      >
        <Command className="z-60 bg-panel" inputMode="text">
          <CommandInput placeholder="Search column..." className="h-9 " />
          <CommandList>
            <CommandEmpty className="">No column found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                key={"no-selection-option"}
                value={"No selection"}
                onSelect={() => onChange(undefined)}
                className=""
              >
                No selection
                <CheckIcon
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === undefined ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
              {filteredColumns.map(({ column, index }) => (
                <CommandItem
                  key={column.columnID}
                  value={column.name}
                  onSelect={() => onChange(index)}
                  className=""
                >
                  {column.name}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === index ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="h-fit p-2 pb-0.5 flex justify-between">
            <div className="flex flex-col w-fit">
              <div className="flex gap-2">
                <BoardKey characters={["↑"]} />
                <BoardKey characters={["↓"]} />
              </div>
              <div className="pt-1 text-muted-foreground text-center">
                Navigation
              </div>
            </div>
            <div className="flex flex-col w-fit ml-auto">
              <BoardKey characters={["Enter"]} />
              <div className="pt-1 text-muted-foreground text-center">
                Select
              </div>
            </div>
            <div className="flex flex-col w-fit ml-auto">
              <BoardKey characters={["esc"]} />
              <div className="pt-1 text-muted-foreground text-center">
                Close
              </div>
              {boardKey === axisActive && (
                <DetectBoardKey
                  stopPropagation
                  preventDefault
                  boardKey={"Escape"}
                  onKeyPress={handleOnEscPress}
                  skipIfExplorerIsFocused
                />
              )}
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface Props {
  columns?: Array<FieldDef>;
  isSmallContainer: boolean;
}

const Toolbar = ({ columns, isSmallContainer }: Props) => {
  /**
   * Contexts
   */
  const dispatch = useAppDispatch();
  const { id: resultId } = useResultContext();
  const { id: panelId } = usePanelContext();
  const { createRef } = useFocusContext();

  /**
   * Selectors
   */
  const chart = useAppSelector(
    (state) => state.results.entities[resultId].uiState.chart
  );
  const { groupByIndex, theme, xAxisIndex, yAxisIndex, type, axisActive } =
    chart;

  /**
   * Callbacks
   */
  const toggleOnChartThemeChange = useCallback(() => {
    dispatch(
      resultChartThemeToggled({
        id: resultId,
      })
    );
  }, [theme]);

  const handleOnChartThemeChange = useCallback(
    (theme: ChartTheme) => {
      dispatch(resultChartChartThemeChanged({ id: resultId, theme }));
    },
    [resultId]
  );

  const onCancelChart = useCallback(() => {
    dispatch(
      chartDialogChanged({
        id: panelId,
        chart: undefined,
      })
    );
  }, [panelId]);

  const handleOnXAxisChange = useCallback(
    (columnIndex: number | undefined) =>
      dispatch(resultChartXAxisChanged({ id: resultId, columnIndex })),
    []
  );

  const handleOnYAxisChange = useCallback(
    (columnIndex: number | undefined) =>
      dispatch(resultChartYAxisChanged({ id: resultId, columnIndex })),
    []
  );

  const handleOnGroupByAxisChange = useCallback(
    (columnIndex: number | undefined) =>
      dispatch(resultChartGroupByAxisChanged({ id: resultId, columnIndex })),
    []
  );

  const handleOnAxisActive = useCallback((axisActive: string | undefined) => {
    dispatch(resultChartAxisActiveChanged({ id: resultId, axisActive }));
  }, []);

  return (
    <>
      <h1 className="text-muted-foreground text-sm mb-4">Options</h1>
      <h2 className="text-muted-foreground">Chart</h2>
      <div className="grid grid-cols-2 gap-y-2 mt-1 px-4 py-2">
        <ChartTypeSelect value={type} />
      </div>

      <h2 className="mt-2 text-muted-foreground">Axes</h2>
      <div className="px-4 py-2 mt-1">
        <AxisSelect
          columns={columns}
          value={xAxisIndex}
          placeholder="Labels"
          className="mt-2"
          onValueChange={handleOnXAxisChange}
          label="X-Axis"
          boardKey="x"
          axisActive={axisActive}
          onAxisActive={handleOnAxisActive}
          showShortcut
        />
        <AxisSelect
          columns={columns}
          value={yAxisIndex}
          placeholder="Values"
          className="mt-4"
          onValueChange={handleOnYAxisChange}
          filterNumeric
          boardKey="y"
          axisActive={axisActive}
          onAxisActive={handleOnAxisActive}
          showShortcut
          label="Y-Axis"
        />
        <AxisSelect
          columns={columns}
          value={groupByIndex}
          placeholder="Group by"
          label="Group by"
          className="mt-4"
          onValueChange={handleOnGroupByAxisChange}
          boardKey="g"
          axisActive={axisActive}
          onAxisActive={handleOnAxisActive}
          showShortcut
        />
      </div>
      <div className="mt-2">
        <h2 className="text-muted-foreground">Theme</h2>
        <div className="flex flex-row items-center gap-2 px-4 py-2 mt-1">
          {/* Same width as the upper selects to match the shortcut position */}
          <div className="min-w-[200px] flex flex-row gap-2">
            <ChartThemeButton
              style="Midnight"
              isChecked={theme === "Midnight"}
              onClick={handleOnChartThemeChange}
            />
            <ChartThemeButton
              style="Colorful"
              isChecked={theme === "Colorful"}
              onClick={handleOnChartThemeChange}
            />
          </div>
          {<BoardKey characters={["C"]} variant="minimal" />}
        </div>
      </div>
      {isSmallContainer === false && (
        <div className="mt-auto w-full">
          <div className="flex gap-2 ml-auto mt-10 w-fit">
            <SmallTooltip description={"Exit chart"} shortcut={["esc"]} asChild>
              <Button
                variant={"outline"}
                onClick={onCancelChart}
                className={cn("items-center bg-panel")}
                ref={createRef("chart", "button", {
                  id: CLOSE_CHART_BUTTON_ID,
                })}
              >
                Close
              </Button>
            </SmallTooltip>
          </div>
        </div>
      )}
      {!axisActive && (
        <DetectBoardKey
          boardKey={"c"}
          onKeyPress={toggleOnChartThemeChange}
          skipIfExplorerIsFocused
        />
      )}
    </>
  );
};

export default Toolbar;

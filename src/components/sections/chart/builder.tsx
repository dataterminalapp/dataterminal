import { ChartData, ChartType } from "chart.js";
import {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChartTheme } from "./themeButton";
import Chart from "./chart";
import Toolbar, { CLOSE_CHART_BUTTON_ID } from "./toolbar";
import { cn } from "@/lib/utils";
import { ClientResult } from "@/services/local/types";
import ChartDataTransformer from "./transformer";
import { useResultContext } from "@/contexts/result";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import DatabaseErrorAnimation from "@/components/sections/explorer/errorAnimation";
import { GearIcon } from "@radix-ui/react-icons";
import { XIcon } from "lucide-react";
import SmallTooltip from "../../utils/SmallTooltip";
import { Button } from "../../ui/button";
import { SheetTrigger, SheetContent, Sheet } from "../../ui/sheet";
import { stopPropagation } from "../../utils";
import { resultChartSheetOpenChanged } from "@/features/result";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import { chartDialogChanged } from "@/features/panel";
import { useFocusContext } from "@/contexts/focus";
import { DialogDescription, DialogTitle } from "../../ui/dialog";

export interface ChartBuildConfig {
  chart: {
    type: ChartType;
    data: ChartData;
  };
  config: {
    xAxisIndex: number | undefined;
    yAxisIndex: number | undefined;
    groupByIndex: number | undefined;
    theme: ChartTheme;
  };
}

const CANCEL_CHART_BUTTON_ID = "CANCEL_CHART_BUTTON_ID";
const CUSTOMIZE_CHART_BUTTON_ID = "CUSTOMIZE_CHART_BUTTON_ID";

export const isResultChartable = ({
  error,
  warning,
  rows,
}: {
  error?: unknown;
  warning?: unknown;
  rows?: unknown[][] | undefined;
}) => {
  if (!error && !warning && rows && rows.length > 0) {
    return true;
  }

  return false;
};

interface Props {
  building: boolean;
  data: ClientResult<unknown[]>;
  className?: string;
}

const ChartBuilder = (props: Props) => {
  /**
   * Contexts
   */
  const dispatch = useAppDispatch();
  const { id: resultId, panelId } = useResultContext();
  const { createRef, setFocus } = useFocusContext();
  const { className } = props;
  const { rows: values, fields: columns } = props.data;

  /**
   * Refs
   */
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * States
   */
  const [sheetIsDefinitelyClosed, setSheetIsDefinitelyClosed] = useState(true);
  const [error, setError] = useState<boolean>(false);
  const [isSmallContainer, setIsSmallContainer] = useState(false);
  const [data, setData] = useState<ChartData>({
    datasets: [],
    labels: [],
  });

  /**
   * Selectors
   */
  const chart = useAppSelector(
    (state) => state.results.entities[resultId].uiState.chart
  );
  const { groupByIndex, theme, xAxisIndex, yAxisIndex, type, sheetOpen } =
    chart;

  /**
   * useEffects
   */
  useEffect(() => {
    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0];
      setIsSmallContainer((entry.contentRect.width || 0) <= 800);
    };

    const observer = new ResizeObserver(handleResize);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [containerRef.current]);

  useEffect(() => {
    if (typeof xAxisIndex === "number" && typeof yAxisIndex === "number") {
      const result = ChartDataTransformer.transform(
        { rows: values, columns },
        {
          type,
          xIndex: xAxisIndex,
          yIndex: yAxisIndex,
          groupByIndex,
        },
        theme
      );

      if (result.error) {
        setError(true);
      } else {
        setError(false);
      }

      setData(result);
    } else {
      setData({
        datasets: [],
      });
    }
  }, [type, xAxisIndex, yAxisIndex, groupByIndex, columns, values, theme]);

  /**
   * Callbakcs
   */
  const handleOnSheetOpenShortcut = useCallback(() => {
    if (isSmallContainer) {
      setSheetIsDefinitelyClosed(false);
      dispatch(
        resultChartSheetOpenChanged({
          id: resultId,
          sheetOpen: true,
        })
      );
    }
  }, [isSmallContainer]);

  /**
   * This open change only runs if the trigger is clicked, it is not affected if the user uses the shortcut.
   */
  const handleOnSheetOpenChange = useCallback((open: boolean) => {
    if (open === true) {
      setSheetIsDefinitelyClosed(false);
    }
    dispatch(
      resultChartSheetOpenChanged({
        id: resultId,
        sheetOpen: open,
      })
    );
  }, []);

  const handleOnKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      if (e.key === "Escape") {
        stopPropagation(e);
      }
    },
    []
  );

  const onCancelChart = useCallback(() => {
    dispatch(
      chartDialogChanged({
        id: panelId,
        chart: undefined,
      })
    );
  }, [panelId]);

  const handleOnEscapePress = useCallback(() => {
    if (sheetIsDefinitelyClosed) {
      onCancelChart();
    }
  }, [onCancelChart, sheetIsDefinitelyClosed]);

  const handleOnGetFocusBack = useCallback(() => {
    if (isSmallContainer) {
      setFocus("chart", "button", { id: CUSTOMIZE_CHART_BUTTON_ID });
    } else {
      setFocus("chart", "button", { id: CLOSE_CHART_BUTTON_ID });
    }
  }, [isSmallContainer, setFocus]);

  /**
   * We need to know if the sheet is definitely closed by using onCloseAutoFocus rather the onOpenChange.
   * The issue is that by using onOpenChange, the state changes before some actions,
   * for example, if you press escape when the sheet is open, the sheet will dispatch onOpenChange,
   * and then other elements will receive the keyboard event, this creates a race condition between
   * the events and the open state change. To avoid the race condition, we can use onCloseAutoFocus,
   * that it is usually used to redirect the focus after the component closed and ended, but fortunately,
   * also works for this case.
   */
  const handleOnCloseAutoFocus = useCallback(() => {
    setSheetIsDefinitelyClosed(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-row h-full max-w-full overflow-hidden"
    >
      <div className="overflow-hidden flex flex-col h-full w-full">
        <div className="relative flex-1 p-4 sm:p-8 lg:p-16 flex flex-col items-center justify-center">
          <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#e5e7eb10_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="z-10 bg-panel w-full max-w-4xl border shadow shadow-black/20 rounded p-4">
            {error ? (
              <DatabaseErrorAnimation
                title="Unable to Display Chart"
                errorMessage="Please check the data format and try adjusting the chart settings."
              />
            ) : (
              <Chart className={cn(className)} data={data} type={type} />
            )}
          </div>
        </div>
      </div>
      {isSmallContainer ? (
        <div className="absolute z-10 top-4 right-4 sm:right-8 flex flex-row gap-2">
          <SmallTooltip description={"Exit chart"} shortcut={["esc"]} asChild>
            <Button
              size={"icon"}
              className="p-1 border shadow shadow-black/20 bg-panel hover:bg-accent focus-visible:outline-none focus-visible:ring-0"
              tabIndex={-1}
              onClick={onCancelChart}
              ref={createRef("chart", "button", {
                id: CANCEL_CHART_BUTTON_ID,
              })}
            >
              <XIcon className="size-4 text-muted-foreground" />
            </Button>
          </SmallTooltip>
          <Sheet onOpenChange={handleOnSheetOpenChange} open={sheetOpen}>
            <SmallTooltip
              description={"Customize chart"}
              shortcut={["s"]}
              asChild
            >
              <SheetTrigger asChild>
                <Button
                  size={"icon"}
                  className="p-1 border shadow shadow-black/20 bg-panel hover:bg-accent focus-visible:outline-none focus-visible:ring-0"
                  tabIndex={-1}
                  ref={createRef("chart", "button", {
                    id: CUSTOMIZE_CHART_BUTTON_ID,
                  })}
                >
                  <GearIcon className="size-4 text-muted-foreground" />
                </Button>
              </SheetTrigger>
            </SmallTooltip>
            {/* We need to stop propagation, like in dialogs, otherwise the global escape will capture this event and close the chart. */}
            <SheetContent
              onKeyDown={handleOnKeyDown}
              onCloseAutoFocus={handleOnCloseAutoFocus}
              aria-describedby="sheet-content"
            >
              {/* Does nothing but we need it because Radix asks for it */}
              <DialogTitle />
              <DialogDescription />
              <Toolbar columns={columns} isSmallContainer={isSmallContainer} />
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="h-full min-w-[280px] w-[280px] border-l p-4">
          <Toolbar columns={columns} isSmallContainer={isSmallContainer} />
        </div>
      )}
      {sheetIsDefinitelyClosed && (
        <DetectBoardKey
          boardKey="Escape"
          preventDefault
          stopPropagation
          skipIfExplorerIsFocused
          onKeyPress={handleOnEscapePress}
        />
      )}
      <DetectBoardKey
        boardKey="Escape"
        preventDefault
        stopPropagation
        enableOnlyIfExplorerIsFocused
        onKeyPress={handleOnGetFocusBack}
      />
      {sheetIsDefinitelyClosed && (
        <DetectBoardKey
          boardKey="s"
          preventDefault
          stopPropagation
          skipIfExplorerIsFocused
          onKeyPress={handleOnSheetOpenShortcut}
        />
      )}
    </div>
  );
};

export default ChartBuilder;

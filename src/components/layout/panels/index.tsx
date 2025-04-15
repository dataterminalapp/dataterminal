import { useMemo, useRef, useEffect, useCallback } from "react";
import SqlInput from "@/components/sections/code/editor";
import { Guide } from "@/components/utils/shortcuts/guide";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import Result from "../../sections/results";
import { usePanelContext } from "@/contexts/panel";
import { useTabContext } from "@/contexts/tab";
import { ResultProvider } from "@/contexts/result";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useFocusContext } from "@/contexts/focus";
import ChartBuilder from "../../sections/chart/builder";
import NavBar from "../navbar";
import { Separator } from "@/components/ui/separator";
import { useVirtualizer } from "@tanstack/react-virtual";
import { chartDialogChanged, panelSizeChanged } from "@/features/panel";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
}

const ResultRender = ({ id }: Props) => {
  const { id: panelId } = usePanelContext();
  const sql = useAppSelector((state) => state.results.entities[id].sql);
  const timing = useAppSelector((state) => state.results.entities[id].timing);
  const analyze = useAppSelector((state) => state.results.entities[id].analyze);
  const transactionId = useAppSelector(
    (state) => state.results.entities[id].transactionId
  );
  const error = useAppSelector((state) => state.results.entities[id].error);

  return (
    <ResultProvider
      result={{
        id,
        panelId,
        sql,
        timing,
        analyze,
        transactionId,
        error,
      }}
    >
      <Result />
    </ResultProvider>
  );
};

const Chart = () => {
  const { id } = usePanelContext();
  const dispatch = useAppDispatch();
  const chart = useAppSelector((state) => state.panels.entities[id].chart);
  const result = useAppSelector(
    (state) => chart && chart.resultId && state.results.entities[chart.resultId]
  );
  const data = useAppSelector(
    (state) =>
      chart && chart.resultId && state.results.entities[chart.resultId].data
  );

  const onBack = useCallback(() => {
    dispatch(
      chartDialogChanged({
        id,
        chart: undefined,
      })
    );
  }, [id]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <NavBar
        onBack={onBack}
        items={["Displaying chart"]}
        tabType={"Results"}
      />
      <Separator className="2xl:mt-4 mt-2" />

      {result && data && (
        <ResultProvider result={result}>
          <ChartBuilder building data={data} />
        </ResultProvider>
      )}
    </div>
  );
};

const Panel = () => {
  /**
   * Contexts
   */
  const { setFocus, updateFocusedResultsContainer } = useFocusContext();
  const { id } = usePanelContext();
  const { id: tabId } = useTabContext();
  const dispatch = useAppDispatch();

  /**
   * Selectors
   */
  const clearIndex = useAppSelector(
    (state) => state.panels.entities[id].historyIndex === undefined
  );
  const resultIds = useAppSelector(
    (state) => state.panels.entities[id].resultIds
  );
  const panelSize = useAppSelector(
    (state) => state.panels.entities[id].panelSize
  );
  const resultEntities = useAppSelector((state) => state.results.entities);
  const chart = useAppSelector((state) => state.panels.entities[id].chart);
  const layout = useAppSelector((state) => state.panels.entities[id].layout);

  /**
   * Refs
   */
  const containerRef = useRef<HTMLDivElement>(null);
  const previousResultIdsLengthRef = useRef(resultIds.length);

  /**
   * Virtualizer
   */
  const virtualizer = useVirtualizer({
    count: resultIds.length,
    getScrollElement: () => containerRef.current,
    estimateSize: (e) => resultEntities[resultIds[e]]?.uiState.estimatedHeight,
    horizontal: false,
    lanes: 1,
    overscan: 3,
  });

  /**
   * Effects
   */
  useEffect(() => {
    if (containerRef.current) {
      // Scroll to bottom when switching tabs and store into the focus context.
      // The results container is used to help with the scrolling behaviour.
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
      });

      updateFocusedResultsContainer(containerRef.current);
    }
  }, [containerRef.current]);

  useEffect(() => {
    if (clearIndex) {
      containerRef.current?.scrollTo({
        top: containerRef.current.scrollHeight,
      });
    }
  }, [clearIndex, containerRef.current]);

  // Auto-scroll to bottom only when new results are added
  useEffect(() => {
    const currentLength = resultIds.length;
    const previousLength = previousResultIdsLengthRef.current;

    // Only scroll if results were added (not removed)
    if (currentLength > previousLength && containerRef.current) {
      requestAnimationFrame(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
        });
      });
    }

    // Update the previous length reference
    previousResultIdsLengthRef.current = currentLength;
  }, [resultIds]);

  const memoizedInput = useMemo(() => {
    return <SqlInput />;
  }, [id, tabId]);

  const handleOnClick = useCallback(() => {
    setFocus("editor", "input", { from: "panels/handleOnClick" });
  }, [setFocus]);

  const handleOnResize = useCallback(
    (size: number) => {
      dispatch(panelSizeChanged({ id, size }));
    },
    [id]
  );

  const items = virtualizer.getVirtualItems();
  const memoizedResults = useMemo(() => {
    return (
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-auto contain-strict"
      >
        {items.length === 0 && (
          <div className="flex h-full w-full">
            <div className="m-auto left-1/2 top-1/2">
              <Guide />
            </div>
          </div>
        )}
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${items[0]?.start ?? 0}px)`,
            }}
          >
            {items.map((virtualRow, index) => (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={cn(index === 0 && "mt-3.5")}
              >
                <ResultRender id={resultIds[virtualRow.index]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [resultIds, items, virtualizer.getTotalSize()]);

  if (chart) {
    return <Chart />;
  } else {
    return (
      <div
        className="relative flex flex-col h-full max-h-full overflow-hidden"
        // onMouseDown={preventDefaultAndStopPropagation}
      >
        {layout === "Terminal" ? (
          <>
            {memoizedResults}
            {memoizedInput}
          </>
        ) : (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              className="hover:cursor-text"
              onClick={handleOnClick}
              defaultSize={panelSize}
              onResize={handleOnResize}
            >
              {memoizedInput}
            </ResizablePanel>
            <ResizableHandle className="w-0.5 data-[resize-handle-state=hover]:bg-muted-foreground/50 duration-500 transition data-[resize-handle-active=pointer]:bg-primary" />
            <ResizablePanel>{memoizedResults}</ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    );
  }
};

export default Panel;

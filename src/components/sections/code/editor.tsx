import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import { SizeIcon, StopIcon } from "@radix-ui/react-icons";
import { Button } from "../../ui/button";
import { APIResponse } from "@/services/types";
import { buildEditorActions } from "./actions";
import { buildEditorOptions } from "./options";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { resultRemoved, searchFilterEnabled } from "@/features/result";
import {
  chartDialogChanged,
  cursorPositionUpdated,
  analyzeModeToggled,
  historyIndexCleared,
  historyIndexDecreased,
  inputUpdated,
  layoutToggled,
  resultRemoved as panelResultRemoved,
} from "@/features/panel";
import useQuery from "@/hooks/useQuery";
import useHistoryNavigation from "@/hooks/useHistoryNavigation";
import { useFocusContext } from "@/contexts/focus";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import { searchOpenChanged } from "@/features/global";
import { preventDefault, stopPropagation } from "../../utils";
import Run, { RunDropdown } from "./run";
import { buildEditorInput, splitQueries } from "./utils";
import { usePanelContext } from "@/contexts/panel";
import { enabled } from "@/features/explorer";
import SmallTooltip from "../../utils/SmallTooltip";
import { nanoid } from "@reduxjs/toolkit";
import { useCommandWidget } from "@/hooks/useCommandWidget";
import OverlayInstruction from "./instructions/overlayInstruction";
import useSelectionPlaceholderWidget from "@/hooks/useSelectionWidget";
import BoardKey from "@/components/utils/shortcuts/boardKey";
import { isResultChartable } from "../chart/builder";

interface Props {
  className?: string;
}

const SqlInput = ({ className }: Props): JSX.Element => {
  /**
   * Contexts
   */
  const { id: panelId } = usePanelContext();
  const { setFocus, register, nextTablePage, previousTablePage } =
    useFocusContext();
  const { userQuery } = useQuery({ panelId });
  const dispatch = useAppDispatch();
  const { decreaseHistoryIndex, focusedResultId, increaseHistoryIndex } =
    useHistoryNavigation(panelId);

  /**
   * Selectors
   */
  const analyzeMode = useAppSelector(
    (state) => state.panels.entities[panelId].analyzeMode
  );
  const historyInput = useAppSelector((state) =>
    focusedResultId ? state.results.entities[focusedResultId].sql : undefined
  );
  const searchFilter = useAppSelector((state) =>
    focusedResultId
      ? state.results.entities[focusedResultId].uiState.searchFilter
      : undefined
  );
  const isHistoryResultChartable = useAppSelector((state) =>
    focusedResultId
      ? isResultChartable({
          error: state.results.entities[focusedResultId].error,
          warning:
            state.results.entities[focusedResultId].data?.notice?.severity ===
            "WARNING",
          rows: state.results.entities[focusedResultId].data?.rows,
        })
      : undefined
  );
  const loading = useAppSelector(
    (state) => state.panels.entities[panelId].loading
  );
  const layout = useAppSelector(
    (state) => state.panels.entities[panelId].layout
  );
  const input = useAppSelector((state) => state.panels.entities[panelId].input);
  const explorerFocused = useAppSelector(
    (state) => state.focus.currentFocus?.area === "explorer"
  );
  const cursorPosition = useAppSelector(
    (state) => state.panels.entities[panelId].cursorPosition
  );

  /**
   * States
   */
  const [hasFocus, setHasFocus] = useState(true);
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [lineCount, setLineCount] = useState(0);
  const [monacoThemeReady, setMonacoThemeReady] = useState(false);

  /**
   * We need to declare the widget hook here because we need the editor first.
   */
  const { state: widgetState, ref: inlineCommandWidget } =
    useCommandWidget(editor);
  const {
    isOpen: isInlineCommandWidgetOpen,
    isPlacedInFirstLine: isInlineCommandPlacedInFirstLine,
  } = widgetState;
  // usePlaceholderWidget({
  //   editor,
  //   isInlineCommandWidgetOpen,
  //   hasFocus,
  // });
  useSelectionPlaceholderWidget({
    editor,
    isInlineCommandWidgetOpen,
    hasFocus,
    layout,
  });

  /**
   * Refs
   */
  const containerRef = useRef<HTMLDivElement>(null);
  const queryRefId = useRef<string | null>(null);

  /**
   * Memos
   */
  const options = useMemo(() => {
    return buildEditorOptions(loading, layout);
  }, [loading, layout]);
  const editorValue = useMemo(
    () => buildEditorInput(layout, input, historyInput),
    [input, historyInput, layout]
  );

  /**
   * We need to make sure the theme is ready before mounting Monaco.
   * Otherwise there is this scenario where the monaco editor loads
   * and the theme is not loaded yet for a few ms. Creating an
   * undesired transition.
   */
  useEffect(() => {
    loader.config({ monaco });
    setMonacoThemeReady(true);
  }, []);

  useEffect(() => {
    const calculateEditorAndUpdateRef = () => {
      if (editor && containerRef.current) {
        let height = (editor.getModel()?.getLineCount() || 1) * 18;
        if (isInlineCommandWidgetOpen && layout === "Terminal") {
          height += 22;
        }
        containerRef.current.style.height = height + "px";
        if (height >= 36 || layout === "IDE") {
          containerRef.current.style.marginTop = "3px";

          // We want to use the parent height here.
          // If we use a fixed height set by the text height, we don't
          // get the same experience as in editors like VSCode,
          // where the height is not set by the text, but by the viewport/height available.
          // For example, if you click in the editor but it is beyond the lines available,
          // the editor will focus itself and move the cursor to the last line.
          const parentHeight = containerRef.current.parentElement?.clientHeight;
          if (parentHeight) {
            containerRef.current.style.height = parentHeight + "px";
          }
        } else {
          containerRef.current.style.marginTop = "0px";
        }
        editor.layout();
      }
    };
    if (containerRef.current) {
      containerRef.current.style.height = "18px";
    }

    if (editor && containerRef.current) {
      calculateEditorAndUpdateRef();

      const updateHeight = () => {
        if (containerRef.current) {
          calculateEditorAndUpdateRef();
        }
      };
      const onSizeChangeDisposable =
        editor.onDidContentSizeChange(updateHeight);
      window.addEventListener("resize", updateHeight);

      return () => {
        onSizeChangeDisposable.dispose();
        window.removeEventListener("resize", updateHeight);
      };
    }
  }, [editor, layout, isInlineCommandWidgetOpen, containerRef.current]);

  useEffect(() => {
    if (historyInput && editor) {
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.revealPositionInCenter({ lineNumber: 1, column: 1 });
    }
  }, [historyInput, editor]);

  const focusExplorerSearchInput = useCallback(() => {
    // If explorer is not enabled, we need to enable it before focusing.
    dispatch(enabled());

    let attempts = 0;
    const maxAttempts = 10;

    const focusOp = (intervalId: NodeJS.Timeout) => {
      const focused = setFocus("explorer", "search", {
        from: "editor/focusExplorerSearchInput",
      });

      if (focused || attempts >= maxAttempts) {
        clearInterval(intervalId);
      } else {
        attempts++;
        console.log("Explorer focus attempt", attempts, "failed");
      }
    };

    // One millisecond or less is enough for it to load, but in case that it takes more:
    const intervalId: NodeJS.Timeout = setInterval(
      () => focusOp(intervalId),
      5
    );
    setTimeout(() => focusOp(intervalId), 0);

    return () => {
      clearInterval(intervalId);
    };
  }, [setFocus]);

  /**
   * Callbacks
   */
  const removeResult = useCallback(() => {
    if (focusedResultId) {
      dispatch(panelResultRemoved({ panelId, resultId: focusedResultId }));
      dispatch(resultRemoved({ id: focusedResultId, panelId }));
      // It is important to decrease the index. Otherwise will fail to set
      // the correect focus after removing the oldest result.
      dispatch(historyIndexDecreased({ id: panelId }));
    }
  }, [dispatch, panelId, resultRemoved, focusedResultId, panelResultRemoved]);

  const focusResultSearch = useCallback(() => {
    if (focusedResultId) {
      setFocus("result", "search", {
        id: focusedResultId,
        from: "editor/focusResultSearch",
      });
      dispatch(searchFilterEnabled({ id: focusedResultId }));
    }
  }, [dispatch, setFocus, searchFilter, focusedResultId]);

  const layoutToggle = useCallback(() => {
    dispatch(layoutToggled({ id: panelId }));
  }, [dispatch, panelId]);

  const focusResultPagination = useCallback(() => {
    if (focusedResultId) {
      setFocus("result", "pagination", {
        id: focusedResultId,
        from: "editor/focusedPaginationInput",
      });
    }
  }, [setFocus, focusedResultId]);

  const onInputChange = useCallback(
    (input?: string) => {
      dispatch(inputUpdated({ id: panelId, input }));
      dispatch(historyIndexCleared({ id: panelId }));
    },
    [dispatch, inputUpdated]
  );

  const increasePaginationIndex = useCallback(() => {
    if (focusedResultId) {
      nextTablePage();
    }
  }, [nextTablePage, focusedResultId]);

  const decreasePaginationIndex = useCallback(() => {
    if (focusedResultId) {
      previousTablePage();
    }
  }, [previousTablePage, focusedResultId]);

  const globalSearchToggle = useCallback(() => {
    dispatch(searchOpenChanged(true));
  }, [dispatch, searchOpenChanged]);

  const handleChart = useCallback(() => {
    if (focusedResultId && isHistoryResultChartable) {
      dispatch(
        chartDialogChanged({
          id: panelId,
          chart: {
            resultId: focusedResultId,
            open: true,
          },
        })
      );
    }
  }, [panelId, focusedResultId, isHistoryResultChartable]);

  const handleRunQuery = useCallback(
    async (useSelection?: boolean) => {
      if (queryRefId.current) return;
      if (!editor) return;
      inlineCommandWidget?.dispose();
      queryRefId.current = nanoid();

      try {
        const model = editor.getModel();
        const selection = editor.getSelection();

        if (!model || !selection) return;

        const content = useSelection
          ? model.getValueInRange(selection)
          : model.getValue();

        // The content is shorted by (...) when browsing the history
        // So just use the history input rather than thecontent.
        const trimmedInput = historyInput?.trim() || content.trim();
        if (!trimmedInput) return;
        const skipInputUpdate = layout === "Terminal" ? false : true;

        try {
          const sqls = splitQueries(trimmedInput);
          if (sqls.length > 1) {
            for (const { sql } of sqls) {
              const success = await userQuery(sql, {
                skipInputUpdate,
              });
              if (!success) {
                return;
              }
            }
          } else {
            const [{ sql }] = sqls;
            await userQuery(sql, {
              skipInputUpdate,
            });
          }
        } catch (err) {
          console.error("Error running query: ", err);
        }
      } finally {
        queryRefId.current = null;
      }
    },
    [editor, historyInput, inlineCommandWidget, userQuery, layout]
  );

  useEffect(() => {
    if (editor) {
      buildEditorActions({
        editor,
        updateInput: onInputChange,
        removeResult,
        focusExplorerSearchInput,
        focusResultPagination,
        increasePaginationIndex,
        decreasePaginationIndex,
        increaseHistoryIndex,
        decreaseHistoryIndex,
        focusResultSearch,
        handleRunQuery,
        layoutToggle,
        globalSearchToggle,
        handleChart,
        historyInput,
        isBrowsingHistory: focusedResultId !== undefined,
        loading,
        layout,
      });
    }
  }, [
    editor,
    removeResult,
    focusExplorerSearchInput,
    focusResultPagination,
    increaseHistoryIndex,
    decreaseHistoryIndex,
    focusResultSearch,
    userQuery,
    layoutToggle,
    globalSearchToggle,
    handleRunQuery,
    handleChart,
    loading,
    historyInput,
    focusedResultId,
    layout,
  ]);

  const handleEditorDidMount = useCallback(
    async (editor: monaco.editor.IStandaloneCodeEditor) => {
      setEditor(editor);
      register("editor", "input", editor);
      setFocus("editor", "input", { from: "editor" });
      editor.onDidBlurEditorText(() => setHasFocus(false));
      editor.onDidFocusEditorText(() => setHasFocus(true));
      setLineCount(editor.getModel()?.getLineCount() || 0);

      // This is useful to keep the cursor in the same place after changing tabs.
      if (cursorPosition) {
        editor.setPosition(cursorPosition);
      }

      // Create a context key for selection
      // This will be later used to handle Run query when pressing CMD + Enter.
      // Otherwise, if we always capture CMD + Enter, the user will have no chance to use it for a normal Enter,
      // while pressing CMD without noticing.
      const hasSelection = editor.createContextKey<boolean>(
        "hasSelection",
        false
      );

      editor.onDidFocusEditorText(() => {
        setFocus("editor", "input", { from: "editor" });
      });

      editor.onDidChangeCursorSelection(() => {
        const selection = editor.getSelection();
        if (selection) {
          hasSelection.set(!selection.isEmpty());
        }
      });

      editor.onDidChangeCursorPosition((e) => {
        const position = e.position;
        dispatch(
          cursorPositionUpdated({
            id: panelId,
            // Avoid using e.position, it contains inappropiate properties for Redux.
            position: {
              column: position.column,
              lineNumber: position.lineNumber,
            },
          })
        );
      });

      editor.onDidChangeModelContent(() => {
        const model = editor.getModel();
        if (!model) return;

        const currentLineCount = model.getLineCount();
        setLineCount(currentLineCount);
      });

      // Uncomment to test LSP :)
      // connectClientToLanguageServer(editor, monaco);
    },
    [dispatch, layout, panelId]
  );

  const handleButtonClick: MouseEventHandler = useCallback(() => {
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
        } finally {
          setFocus("editor", "input", {
            from: "editor/ handleButtonClick",
          });
        }
      };
      asyncOp();
    } else {
      dispatch(analyzeModeToggled({ id: panelId }));
      setFocus("editor", "input", {
        from: "editor/ handleButtonClick",
      });
    }
  }, [dispatch, panelId, editor, loading]);

  return (
    <div
      className={cn(
        className,
        layout === "Terminal" &&
          "flex flex-row relative rounded-sm rounded-l-none border-l-0 items-center mb-2",
        layout === "IDE" &&
          "bg-editor h-full max-h-full overflow-hidden relative",
        layout === "Terminal" && "border-t border-border/50 pt-2"
      )}
    >
      {layout === "Terminal" && <OverlayInstruction editor={editor} />}
      {layout === "Terminal" && (
        <>
          {/* It is important to send an undefined, because otherwise the dropdown will expect us to handle the open state manually. By sending undefined, the dropdown is in charge of the state.. */}
          <RunDropdown open={loading ? false : undefined}>
            <Button
              variant={"ghost"}
              size={"icon"}
              className={cn(
                "rounded-l-none px-1 disabled:opacity-100 relative flex-shrink-0 size-6 stroke-primary self-start transition-all",
                isInlineCommandWidgetOpen &&
                  isInlineCommandPlacedInFirstLine &&
                  "mt-1"
              )}
              onClick={handleButtonClick}
            >
              <StopIcon
                className={cn(
                  "size-3 stroke-1 absolute inset-0 transition-all duration-300 ease-in-out m-auto",
                  loading ? "opacity-100 scale-100" : "opacity-0 scale-75"
                )}
              />
              <ChevronRightIcon
                className={cn(
                  "size-4 absolute inset-0 transition-all duration-300 ease-in-out m-auto",
                  loading
                    ? "opacity-0 scale-75 rotate-90"
                    : "opacity-100 scale-100",
                  analyzeMode && "stroke-orange-400",
                  !hasFocus &&
                    !isInlineCommandWidgetOpen &&
                    "stroke-muted-foreground"
                )}
              />
            </Button>
          </RunDropdown>
          {lineCount > 1 && (
            <SmallTooltip
              description={layout === "Terminal" ? "Expand" : "Collapse"}
              shortcut={["⌘", "E"]}
              asChild
            >
              <Button
                className={cn(
                  className,
                  "absolute items-center top-2 right-4 z-50 size-6 px-1 rounded bg-panel text-muted-foreground rotate-90"
                )}
                onClick={layoutToggle}
                onMouseDown={preventDefault}
                variant={"ghost"}
                size={"icon"}
              >
                <SizeIcon className="size-4" />
              </Button>
            </SmallTooltip>
          )}
        </>
      )}
      {layout === "IDE" && (
        <Run editor={editor} handleRunQuery={handleRunQuery} />
      )}
      <div
        ref={containerRef}
        className={cn(
          "w-full",
          layout === "Terminal"
            ? "max-h-[40vh]"
            : "h-full max-h-full w-full max-w-full"
        )}
        // These two are necessary to hold the foucs onClick and onMouseDown for the find/search overlay widget.
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
      >
        <BoardKey
          className={cn(
            "absolute bottom-0.5 left-6",
            !hasFocus && !isInlineCommandWidgetOpen && !input && !historyInput
              ? "visible"
              : "hidden",
            layout === "IDE" && "top-0.5 left-14",
            explorerFocused && "text-muted-foreground"
          )}
          variant="ghost"
          characters={["esc"]}
        />
        {monacoThemeReady && (
          <Editor
            value={editorValue}
            onChange={onInputChange}
            onMount={handleEditorDidMount}
            theme={historyInput ? "history" : "sql-dark"}
            loading={null}
            language={historyInput ? "text" : "pgsql"}
            className={cn(
              "z-10 outline-none pl-1",
              loading && layout === "Terminal" ? "opacity-50" : "",
              "overflow-hidden min-h-[80px]",
              "w-full"
            )}
            options={options}
          />
        )}
        {!hasFocus && (
          <DetectBoardKey
            boardKey="Escape"
            preventDefault
            stopPropagation
            onKeyPress={() => setFocus("editor", "input", { from: "editor" })}
          />
        )}
        {!hasFocus && (
          <DetectBoardKey
            boardKey="Tab"
            preventDefault
            stopPropagation
            onKeyPress={() => setFocus("editor", "input", { from: "editor" })}
          />
        )}
      </div>
    </div>
  );
};

export default SqlInput;

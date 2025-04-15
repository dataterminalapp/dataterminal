import { currentFocusUpdated } from "@/features/focus";
import { useAppDispatch } from "@/hooks/useRedux";
import { DataEditorRef } from "@glideapps/glide-data-grid/dist/dts";
import { editor } from "monaco-editor";
import {
  useRef,
  useCallback,
  createContext,
  useContext,
  PropsWithChildren,
} from "react";

export type FocusArea =
  | "explorer"
  | "editor"
  | "result"
  | "dialog"
  | "connection"
  | "browser"
  | "audit"
  | "dashboard"
  | "chart"
  | "dialog";
export type FocusTarget =
  | "input"
  | "button"
  | "search"
  | "pagination"
  | "command"
  | "row"
  | "node"
  | "table"
  | "container";

export interface FocusState {
  area: FocusArea;
  target: FocusTarget;
  id?: string; // Optional ID for dynamic elements
}

export interface FocusHistoryEntry extends FocusState {
  timestamp: number;
}

export interface UseFocusManagerOptions {
  initialFocus?: FocusState;
}

export interface FocusOptions {
  force?: boolean;
  skipHistory?: boolean;
  id?: string;
  from?: string;
}

/**
 * Fallbacck to the following element if the requested key does not exist.
 * This happens, for example, after focusing the search, switching to dropdown
 * then close dropdown.
 */
const DEFAULT_FALLBACK = "editor-input";

function useFocusManager(options: UseFocusManagerOptions = {}) {
  // Store the current focus in the redux state to react to the current focus updates globally.
  // This is a way to avoid using getCurrentFocus and get an old value.
  const dispatch = useAppDispatch();

  // Keep track of all focusable elements
  const focusRefs = useRef(
    new Map<string, HTMLElement | editor.IStandaloneCodeEditor>()
  );

  // Keep track of current focus
  const currentFocus = useRef<FocusState | null>(options.initialFocus || null);

  // Keep track of focus history
  const focusHistory = useRef<FocusHistoryEntry[]>([]);

  // Keep track of automatic focus elements
  const autoFocusRefs = useRef(new Set<string>());

  // Keep track of focus history table;
  const tableRef = useRef<DataEditorRef | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const getFocusKey = (area: FocusArea, target: FocusTarget, id?: string) => {
    return id ? `${area}-${target}-${id}` : `${area}-${target}`;
  };

  const unregister = useCallback(
    (area: FocusArea, target: FocusTarget, id?: string) => {
      const key = getFocusKey(area, target, id);
      focusRefs.current.delete(key);
      autoFocusRefs.current.delete(key);
    },
    []
  );

  const register = useCallback(
    (
      area: FocusArea,
      target: FocusTarget,
      element: HTMLElement | editor.IStandaloneCodeEditor | null,
      options: { autoFocus?: boolean; id?: string } = {}
    ) => {
      const key = getFocusKey(area, target, options.id);
      if (element) {
        focusRefs.current.set(key, element);
        if (options.autoFocus) {
          autoFocusRefs.current.add(key);
        } else {
          autoFocusRefs.current.delete(key);
        }
      } else {
        focusRefs.current.delete(key);
        autoFocusRefs.current.delete(key);
      }
    },
    []
  );

  const pushToHistory = useCallback((state: FocusState) => {
    const key = getFocusKey(state.area, state.target, state.id);
    // Don't track history for auto-focus elements
    if (!autoFocusRefs.current.has(key)) {
      focusHistory.current.push({
        ...state,
        timestamp: Date.now(),
      });
    }
  }, []);

  const setFocus = useCallback(
    (area: FocusArea, target: FocusTarget, options: FocusOptions = {}) => {
      const key = getFocusKey(area, target, options.id);
      const element = focusRefs.current.get(key || DEFAULT_FALLBACK);

      // Don't force focus on auto-focus elements unless explicitly requested
      if (autoFocusRefs.current.has(key) && !options.force) {
        return false;
      }

      if (element) {
        if (currentFocus.current && !options.skipHistory) {
          pushToHistory(currentFocus.current);
        }

        currentFocus.current = { area, target, id: options.id };
        element.focus();
        dispatch(currentFocusUpdated(currentFocus.current));
        return true;
      } else {
        console.warn(
          "Element to focus not found: ",
          area,
          target,
          options,
          key
        );
        return false;
      }
    },
    [pushToHistory]
  );

  const restoreFocus = useCallback(
    (from?: string) => {
      if (currentFocus.current) {
        const key = getFocusKey(
          currentFocus.current.area,
          currentFocus.current.target,
          currentFocus.current.id
        );

        // Skip auto-focus elements when restoring
        if (!autoFocusRefs.current.has(key)) {
          setFocus(currentFocus.current.area, currentFocus.current.target, {
            skipHistory: true,
            id: currentFocus.current.id,
            from,
          });
        }
      }
    },
    [setFocus]
  );

  const restorePreviousFocus = useCallback(
    (from?: string) => {
      // Remove any focus states from the current dialog/modal
      while (focusHistory.current.length > 0) {
        const previousFocus = focusHistory.current.pop()!;
        const key = getFocusKey(
          previousFocus.area,
          previousFocus.target,
          previousFocus.id
        );

        // Skip auto-focus elements when restoring
        if (!autoFocusRefs.current.has(key)) {
          setFocus(previousFocus.area, previousFocus.target, {
            skipHistory: true,
            id: previousFocus.id,
            from,
          });
          break;
        }
      }
    },
    [setFocus]
  );

  const createRef = useCallback(
    (
      area: FocusArea,
      target: FocusTarget,
      options: { autoFocus?: boolean; id?: string } = {}
    ) => {
      return (element: HTMLElement | null) =>
        register(area, target, element, options);
    },
    [register]
  );

  const updateFocusedTable = useCallback(
    (table: DataEditorRef, tableContainer: HTMLDivElement) => {
      tableRef.current = table;
      tableContainerRef.current = tableContainer;

      if (resultsContainerRef.current) {
        const containerRect =
          resultsContainerRef.current.getBoundingClientRect();
        const tableParent = tableContainerRef.current.parentElement;

        // We want to work over the parent, because the parent holds the table + pagination + timing.
        if (tableParent) {
          const resultRect = tableParent.getBoundingClientRect();

          const isFullyVisible =
            resultRect.top >= containerRect.top &&
            resultRect.bottom <= containerRect.bottom;

          if (!isFullyVisible) {
            tableParent.scrollIntoView({
              block: "nearest",
            });
          }
        }
      }
    },
    []
  );

  const updateFocusedResultsContainer = useCallback(
    (container: HTMLDivElement) => {
      resultsContainerRef.current = container;
    },
    []
  );

  // Almost deprecated
  const previousTablePage = useCallback(() => {
    // if (tableRef.current) {
    //   tableRef.current.scrollTo(
    //     { amount: 10, unit: "cell" },
    //     { amount: 0, unit: "cell" },
    //     "vertical"
    //   );
    // }
  }, []);

  // Almost deprecated
  const nextTablePage = useCallback(() => {
    // if (tableRef.current) {
    //   tableRef.current.scrollTo(
    //     { amount: 0, unit: "cell" },
    //     { amount: 30, unit: "cell" },
    //     "vertical"
    //   );
    // }
  }, []);

  return {
    register,
    unregister,
    setFocus,
    createRef,
    getCurrentFocus: useCallback(() => currentFocus.current, []),
    restorePreviousFocus,
    restoreFocus,
    updateFocusedTable,
    previousTablePage,
    nextTablePage,
    updateFocusedResultsContainer,
  };
}

// Context and Provider implementation
export type FocusManagerContextValue = ReturnType<typeof useFocusManager>;

const FocusManagerContext = createContext<FocusManagerContextValue | null>(
  null
);

export function FocusManagerProvider({ children }: PropsWithChildren) {
  const focusManager = useFocusManager({
    initialFocus: { area: "editor", target: "input" },
  });

  return (
    <FocusManagerContext.Provider value={focusManager}>
      {children}
    </FocusManagerContext.Provider>
  );
}

export function useFocusContext() {
  const context = useContext(FocusManagerContext);
  if (!context) {
    throw new Error(
      "useFocusContext must be used within a FocusManagerProvider"
    );
  }
  return context;
}

import { Layout } from "@/features/panel";
import * as monaco from "monaco-editor";
import { editor, Position } from "monaco-editor";

export const buildEditorActions = ({
  editor,
  updateInput,
  removeResult,
  focusExplorerSearchInput,
  increasePaginationIndex,
  decreasePaginationIndex,
  focusResultPagination,
  increaseHistoryIndex,
  decreaseHistoryIndex,
  focusResultSearch,
  layoutToggle,
  globalSearchToggle,
  handleRunQuery,
  handleChart,
  historyInput,
  isBrowsingHistory,
  loading,
  layout,
}: {
  editor: editor.IStandaloneCodeEditor;
  historyInput?: string;
  loading: boolean;
  isBrowsingHistory: boolean;
  layout: Layout;
  focusExplorerSearchInput: () => void;
  focusResultPagination: () => void;
  increasePaginationIndex: () => void;
  decreasePaginationIndex: () => void;
  focusResultSearch: () => void;
  increaseHistoryIndex: () => void;
  decreaseHistoryIndex: () => void;
  updateInput: (input: string) => void;
  removeResult: () => void;
  layoutToggle: () => void;
  globalSearchToggle: () => void;
  handleRunQuery: (useSelection: boolean) => void;
  handleChart: () => void;
}) => {
  const actions: Array<{
    activation: () => monaco.IDisposable;
    condition: (position: Position) => boolean;
    disposable?: monaco.IDisposable;
  }> = [];
  const isInitialPosition = (position: Position) =>
    position.lineNumber === 1 && position.column === 1;

  actions.push(
    {
      activation: () =>
        editor.addAction({
          id: "replaceHistoryWithRealInput",
          label: "Replace History Input with Real Input",
          keybindings: [monaco.KeyCode.Tab],
          run: (): void => {
            if (historyInput) {
              updateInput(historyInput);
            }
          },
        }),
      condition: (position) => isBrowsingHistory && isInitialPosition(position),
    },
    {
      activation: () =>
        editor.addAction({
          id: "historyUpAction",
          label: "Handle Up Arrow for History",
          keybindings: [monaco.KeyCode.UpArrow],
          run: (): void => {
            increaseHistoryIndex();
          },
        }),
      condition: (position) =>
        !loading && isInitialPosition(position) && layout === "Terminal",
    },
    {
      activation: () =>
        editor.addAction({
          id: "historyDownAction",
          label: "Handle Down Arrow for History",
          keybindings: [monaco.KeyCode.DownArrow],
          run: (): void => {
            decreaseHistoryIndex();
          },
        }),
      condition: (position) =>
        isBrowsingHistory && !loading && isInitialPosition(position),
    },
    {
      activation: () =>
        editor.addAction({
          id: "searchAction",
          label: "Focus the Explore search Input",
          keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, // CMD + Shift + F
          ],
          run: (): void => {
            focusExplorerSearchInput();
          },
        }),
      condition: () => true,
    },
    {
      activation: () =>
        editor.addAction({
          id: "deleteAction",
          label: "Delete the search result",
          keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backspace, // CMD + Dlete
          ],
          run: (): void => {
            removeResult();
          },
        }),
      condition: () => isBrowsingHistory,
    },
    {
      activation: () =>
        editor.addAction({
          id: "ctrlFAction",
          label: "Handle Ctrl + F",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
          run: (): void => {
            if (isBrowsingHistory) {
              focusResultSearch();
            }
          },
        }),
      // Always - This way we disable search when in terminal mode.
      condition: () => layout === "Terminal",
    },
    {
      activation: () =>
        editor.addAction({
          id: "ctrlEAction",
          label: "Handle Ctrl + E",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
          run: (): void => {},
        }),
      // Always - This way we disable search in the input.
      condition: () => true,
    },
    {
      activation: () =>
        editor.addAction({
          id: "enterAction",
          label: "Handle Enter Key on Terminal",
          keybindings: [monaco.KeyCode.Enter],
          precondition: "!suggestWidgetVisible && !findWidgetVisible",
          run: () => handleRunQuery(false),
        }),
      condition: () => layout === "Terminal",
    },
    {
      activation: () =>
        editor.addAction({
          id: "enterAction",
          label: "Handle Enter Key on IDE",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
          precondition:
            "!suggestWidgetVisible && !findWidgetVisible && hasSelection",
          run: () => handleRunQuery(true),
        }),
      condition: () => layout === "IDE",
    },
    {
      activation: () =>
        editor.addAction({
          id: "increaseHistoryPaginationAction",
          label: "Handle increase pagination key",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period],
          run: (): void => {
            increasePaginationIndex();
          },
        }),
      condition: () => isBrowsingHistory,
    },
    {
      activation: () =>
        editor.addAction({
          id: "increaseHistoryPaginationActionAlt",
          label: "Handle increase pagination key (alternative)",
          keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Period],
          run: (): void => {
            increasePaginationIndex();
          },
        }),
      condition: () => isBrowsingHistory,
    },
    {
      activation: () =>
        editor.addAction({
          id: "decreaseHistoryPaginationAction",
          label: "Handle decrease pagination key",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
          run: (): void => {
            decreasePaginationIndex();
          },
        }),
      condition: () => isBrowsingHistory,
    },
    {
      activation: () =>
        editor.addAction({
          id: "decreaseHistoryPaginationActionAlt",
          label: "Handle decrease pagination key (alternative)",
          keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.Comma],
          run: (): void => {
            decreasePaginationIndex();
          },
        }),
      condition: () => isBrowsingHistory,
    },
    {
      activation: () =>
        editor.addAction({
          id: "focusPaginationAction",
          label: "Handle pagination index focus",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
          run: (): void => {
            focusResultPagination();
          },
        }),
      condition: () => isBrowsingHistory,
    },
    {
      activation: () =>
        editor.addAction({
          id: "ctrlGAction",
          label: "Handle Ctrl + G",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
          run: () => {
            handleChart();
          },
        }),
      condition: () => true,
    },
    {
      activation: () =>
        editor.addAction({
          id: "ctrlLAction",
          label: "Handle Ctrl + E",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE],
          run: layoutToggle,
        }),
      condition: () => true,
    },
    {
      activation: () =>
        editor.addAction({
          id: "ctrlLShiftAction",
          label: "Handle Ctrl + E",
          keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE,
          ],
          run: layoutToggle,
        }),
      condition: () => true,
    },
    {
      activation: () =>
        editor.addAction({
          id: "ctrlP",
          label: "Handle Ctrl + /",
          keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP],
          run: globalSearchToggle,
        }),
      condition: () => true,
    }
  );

  const updateActions = () => {
    const position = editor.getPosition();
    if (!position) return;

    // Dispose all previous actions.
    actions.forEach(({ disposable }) => disposable?.dispose());

    // Activate actions.
    actions.forEach((action) => {
      if (action.condition(position)) {
        action.disposable = action.activation();
      } else {
        return action;
      }
    });
  };

  // Update actions initially
  updateActions();

  // Add a listener to update actions on cursor position change
  const onDidChangeCursorSelectionDisposable =
    editor.onDidChangeCursorSelection(updateActions);

  // Cleanup
  return () => {
    if (onDidChangeCursorSelectionDisposable)
      onDidChangeCursorSelectionDisposable.dispose();
    actions.forEach((x) => x.disposable?.dispose());
  };
};

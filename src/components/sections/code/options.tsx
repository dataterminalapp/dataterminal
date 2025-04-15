import { Layout } from "@/features/panel";
import * as monaco from "monaco-editor";

export const buildEditorOptions = (
  loading: boolean,
  layout: Layout
): monaco.editor.IStandaloneEditorConstructionOptions => {
  return {
    readOnly: loading,
    minimap: {
      enabled: false,
    },
    suggest: {
      preview: true,
      selectionMode: "whenQuickSuggestion",
      matchOnWordStartOnly: true,
    },
    inlineSuggest: {
      showToolbar: "never",
    },
    contextmenu: false,
    cursorStyle: layout === "Terminal" ? "block" : "line",
    find: {
      addExtraSpaceOnTop: false,
      seedSearchStringFromSelection: "never",
    },
    cursorBlinking: layout === "Terminal" ? "smooth" : "blink",
    lineNumbers: layout === "Terminal" ? "off" : "on",
    lineDecorationsWidth: layout === "Terminal" ? 0 : 10,
    lineNumbersMinChars: layout === "Terminal" ? 0 : 5,
    folding: layout === "Terminal" ? false : false,
    glyphMargin: layout === "Terminal" ? false : false,
    renderLineHighlight: "none",
    fixedOverflowWidgets: true,

    // Add error handling for cancelled suggestions
    scrollbar: {
      horizontal: layout === "IDE" ? "auto" : "hidden",
      vertical: "auto",
      // Otherwise the shadow will overlap with the run button,
      // and at the same time will look incorrect due to the padding.
      useShadows: layout === "IDE" ? false : true,
      // Avoid can not scroll page when hover monaco
      alwaysConsumeMouseWheel: false,
    },
    stickyScroll: {
      enabled: false,
    },
    // Rules for auto-size
    scrollBeyondLastLine: false,
    wordWrap: "off",
    wrappingStrategy: "advanced",
    overviewRulerLanes: 0,
    automaticLayout: false,
  };
};

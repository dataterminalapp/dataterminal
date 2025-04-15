import PlaceholderWidget from "@/components/sections/code/instructions/placeholder";
import { useEffect } from "react";
import * as monaco from "monaco-editor";

/**
 * The placeholder widget (for AI) is displayed when the editor content is empty, the editor has focus,
 * and the inline command widget is not open.
 */
const usePlaceholderWidget = ({
  editor,
  hasFocus,
  isInlineCommandWidgetOpen,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  hasFocus: boolean;
  isInlineCommandWidgetOpen: boolean;
}) => {
  useEffect(() => {
    let placeholderWidget: PlaceholderWidget | null = null;

    if (hasFocus && !isInlineCommandWidgetOpen && editor) {
      placeholderWidget = new PlaceholderWidget(editor);
    }

    return () => {
      if (placeholderWidget) {
        placeholderWidget.dispose();
      }
    };
  }, [editor, hasFocus, isInlineCommandWidgetOpen]);
};

export default usePlaceholderWidget;

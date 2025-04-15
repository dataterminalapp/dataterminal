import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import SelectionPlaceholderWidget from "@/components/sections/code/instructions/selection";
import { Layout } from "@/features/panel";

/**
 * This widget displays a shortcut to run a query, but only when the user selects text
 * in the editor while in "IDE" layout mode. The widget is created and disposed of
 * dynamically based on the provided conditions.
 *
 * @remarks
 * - The widget is only created if the editor has focus, the inline command widget is closed,
 *   and the layout is set to "IDE".
 * - The widget is disposed of when the component unmounts or when any of the dependencies change.
 */
const useSelectionPlaceholderWidget = ({
  editor,
  hasFocus,
  isInlineCommandWidgetOpen,
  layout,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  hasFocus: boolean;
  isInlineCommandWidgetOpen: boolean;
  layout: Layout;
}) => {
  const widgetRef = useRef<SelectionPlaceholderWidget | null>(null);

  useEffect(() => {
    // Cleanup previous widget if conditions change
    if (widgetRef.current) {
      widgetRef.current.dispose();
      widgetRef.current = null;
    }

    // Only create the widget if editor has focus, command widget is closed, and editor exists
    if (hasFocus && !isInlineCommandWidgetOpen && editor && layout === "IDE") {
      widgetRef.current = new SelectionPlaceholderWidget(editor);
    }

    // Cleanup when component unmounts or dependencies change
    return () => {
      if (widgetRef.current) {
        widgetRef.current.dispose();
        widgetRef.current = null;
      }
    };
  }, [editor, layout, hasFocus, isInlineCommandWidgetOpen]);
};

export default useSelectionPlaceholderWidget;

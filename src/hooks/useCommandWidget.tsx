import InlineInstructionWidget from "@/components/sections/code/instructions/inlineInstruction";
import { useRef, useEffect, useState } from "react";
import * as monaco from "monaco-editor";
import { usePanelContext } from "@/contexts/panel";
import { useToast } from "./useToast";
import { useAppSelector } from "./useRedux";

/**
 * Custom command widget for AI commands.
 */
export const useCommandWidget = (
  editor: monaco.editor.IStandaloneCodeEditor | null
) => {
  const { id: panelId } = usePanelContext();
  const { toast } = useToast();
  const widgetRef = useRef<InlineInstructionWidget | null>(null);
  const [state, setState] = useState({
    isOpen: false,
    isPlacedInFirstLine: false,
  });
  const layout = useAppSelector(
    (state) => state.panels.entities[panelId].layout
  );

  useEffect(() => {
    if (!editor) return;
    if (layout === "Terminal") return;

    const widget = new InlineInstructionWidget(editor, panelId, toast, () => {
      widgetRef.current = null;
      setState({
        isOpen: false,
        isPlacedInFirstLine: false,
      });
    });

    // Add command handler
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      if (widgetRef.current) {
        widgetRef.current.focus();
      } else {
        widgetRef.current = widget;

        widget.show();
        const position = editor.getPosition();
        setState({
          isOpen: true,
          isPlacedInFirstLine: position?.lineNumber === 1,
        });
      }
    });

    return () => {
      if (widgetRef.current) {
        widgetRef.current.dispose();
      }
    };
  }, [editor, toast]);

  return {
    ref: widgetRef.current,
    state,
  };
};

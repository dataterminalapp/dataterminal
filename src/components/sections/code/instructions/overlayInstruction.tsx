import { usePanelContext } from "@/contexts/panel";
import { useAppSelector } from "@/hooks/useRedux";
import { useEffect, useRef, useState } from "react";
import { InlineCommand } from "./inlineInstruction";
import * as monaco from "monaco-editor";
import { Editor } from "@tiptap/react";

const OverlayInstruction = ({
  editor,
}: {
  editor: monaco.editor.IStandaloneCodeEditor | null;
}) => {
  const { id: panelId } = usePanelContext();
  const layout = useAppSelector(
    (state) => state.panels.entities[panelId].layout
  );
  const editorRef = useRef<Editor>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!editor) return;
    if (layout !== "Terminal") return;

    // Add command handler
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      if (editorRef.current) {
        editorRef.current.commands.focus();
      } else {
        setShow(true);
      }
    });

    return () => {
      setShow(false);
    };
  }, [editor, layout]);

  return (
    <div className="absolute bg-panel backdrop-blur-3xl -top-7 mt-0.5 left-6 z-10 overflow-hidden max-w-full pr-12">
      {editor && show && (
        <InlineCommand
          className="border-b-0 rounded-b-none min-w-[470px] w-fit"
          editor={editor}
          ref={editorRef}
          onSubmit={() => {
            setShow(false);
            editor.focus();
          }}
          onCancel={() => {
            setShow(false);
            editor.focus();
          }}
          onError={() => {}}
        />
      )}
    </div>
  );
};

export default OverlayInstruction;

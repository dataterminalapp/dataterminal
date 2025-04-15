import React, { forwardRef, useImperativeHandle } from "react";
import Placeholder from "@tiptap/extension-placeholder";

import {
  useEditor,
  EditorContent,
  Editor as TipTapEditor,
  Extension,
} from "@tiptap/react";
import { Text } from "@tiptap/extension-text";
import { Paragraph } from "@tiptap/extension-paragraph";
import { History } from "@tiptap/extension-history";
import { buildSuggestions } from "./mention/suggestion";
import { CustomMention } from "./mention/customMentionExtension";
import { useAppSelector } from "@/hooks/useRedux";

interface InstructionTextareaProps {
  instructions: string[];
  loading: boolean;
  readOnly?: boolean;
  singleLine?: boolean;
  updateContainerHeight: () => void;
  handleEnter: () => void;
  handleEscape: () => void;
}

import { Node } from "@tiptap/core";
import { cn } from "@/lib/utils";

const OneLiner = Node.create({
  name: "oneLiner",
  topNode: true,
  content: "block",
});

const Editor = forwardRef<TipTapEditor | undefined, InstructionTextareaProps>(
  ({ loading, readOnly, handleEnter, handleEscape }, ref) => {
    const currentSchemaName = useAppSelector(
      (state) => state.workspace.schema.current
    );
    const schema = useAppSelector((state) =>
      currentSchemaName
        ? state.schema.schemas.entities[currentSchemaName]
        : undefined
    );

    const suggestions = buildSuggestions(schema);
    const extensions = [
      OneLiner,
      Text,
      Paragraph.extend({
        addAttributes() {
          return { class: { default: "singleLine" } };
        },
      }),
      CustomMention.configure({
        suggestion: {
          ...suggestions,
        },
      }),
      History,
      Placeholder.configure({
        placeholder: "Jot instructions… (@ for context)",
      }),
      Extension.create({
        name: "customKeyboardShortcuts",
        addKeyboardShortcuts() {
          return {
            "Mod-Enter": () => {
              console.log("Mod Enter press");
              if (!loading) {
                handleEnter();
              }
              return true;
            },
            "Mod-Backspace": () => {
              handleEscape();
              return true;
            },
            Enter: () => {
              console.log("Enter press");
              if (!loading) {
                handleEnter();
              }
              // Prevent the default enter behavior
              return true;
            },
            Escape: () => {
              handleEscape();
              return true;
            },
          };
        },
      }),
    ];
    const editor = useEditor({
      extensions,
    });

    useImperativeHandle(ref, () => (editor ? editor : undefined), [editor]);

    return (
      <>
        <EditorContent
          editor={editor}
          autoFocus
          className={cn(
            "ml-1 outline-none ring-0 w-full truncate pr-3",
            (readOnly || loading) && "text-muted-foreground caret-transparent"
          )}
          readOnly={readOnly}
        />
      </>
    );
  }
);

export default Editor;

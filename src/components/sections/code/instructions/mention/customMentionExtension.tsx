import { default as MentionExtension } from "@tiptap/extension-mention";
import { ReactNodeViewRenderer, mergeAttributes } from "@tiptap/react";
import { Mention } from "./mention";

export const CustomMention = MentionExtension.extend({
  addNodeView() {
    return ReactNodeViewRenderer(Mention);
  },
  parseHTML() {
    return [
      {
        tag: "mention-component",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mention-component", mergeAttributes(HTMLAttributes)];
  },
});

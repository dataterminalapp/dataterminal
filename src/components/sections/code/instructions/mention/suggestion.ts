import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance } from "tippy.js";
import { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { MentionList } from "./mentionList";
import { BaseEntity, Schema } from "@/features/schema";
import { stopPropagation } from "@/components/utils";

export const buildSuggestions = (schema: Schema | undefined) => {
  const suggestion: Partial<SuggestionOptions<BaseEntity>> = {
    items: ({ query }: { query: string }) => {
      return (
        schema?.tables
          .filter((x) => x.name.toLowerCase().startsWith(query.toLowerCase()))
          .slice(0, 5) || []
      );
    },
    render: () => {
      let component: ReactRenderer<
        ReturnType<NonNullable<SuggestionOptions["render"]>>,
        SuggestionProps<BaseEntity>
      >;
      let popup: Instance;

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy(document.body as Element, {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === "Escape") {
            popup.hide();
            stopPropagation(props.event);

            return true;
          } else if (props.event.key === "Enter") {
            stopPropagation(props.event);
          }

          return !!component?.ref?.onKeyDown?.(props);
        },

        onExit() {
          popup.destroy();
          component.destroy();
        },
      };
    },
  };

  return suggestion;
};

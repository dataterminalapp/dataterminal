import { BaseEntity } from "@/features/schema";
import { cn } from "@/lib/utils";
import { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export const MentionList = forwardRef<
  ReturnType<NonNullable<SuggestionOptions["render"]>>,
  SuggestionProps<BaseEntity>
>(({ command, items }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = items[index];

    if (item) {
      command({ id: item.id, label: item.name });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + items.length - 1) % items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div
      className="min-w-[8rem] overflow-hidden rounded border bg-panel p-1 text-popover-foreground shadow-md"
      style={{ fontSize: "11px" }}
    >
      {items.length ? (
        items.map((item, index) => (
          <button
            className={cn(
              "relative flex cursor-default select-none items-center rounded-sm px-2 py-0.5 outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full",
              index === selectedIndex && "bg-accent text-accent-foreground"
            )}
            key={item.id}
            onClick={() => selectItem(index)}
          >
            {item.name}
          </button>
        ))
      ) : (
        <div className="item">No result</div>
      )}
    </div>
  );
});

export default MentionList;

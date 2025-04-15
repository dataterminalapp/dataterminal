import {
  Dialog as _Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import BoardKey from "./boardKey";
import { useFocusContext } from "@/contexts/focus";
import { useCallback } from "react";
import { useAppSelector } from "@/hooks/useRedux";
import { KeyboardIcon } from "@radix-ui/react-icons";

const shortcuts = [
  {
    section: "Navigation",
    shortcuts: [
      {
        detail: "Open tab",
        kb: ["⌘", "T"],
      },
      {
        detail: "Switch tab",
        kb: ["⌘", "[N]"],
      },
      {
        detail: "Close tab",
        kb: ["⌘", "W"],
      },
      {
        detail: "Toggle Explorer",
        kb: ["⌘", "B"],
      },
    ],
  },
  {
    section: "Results",
    shortcuts: [
      {
        detail: "Remove Result",
        kb: ["⌘", "←"],
      },
      {
        detail: "Search",
        kb: ["⌘", "F"],
      },
      {
        detail: "Chart",
        kb: ["⌘", "G"],
      },
    ],
  },
  {
    section: "Charts toolbar",
    shortcuts: [
      {
        detail: "Group By",
        kb: ["G"],
      },
      {
        detail: "X-Axis",
        kb: ["X"],
      },
      {
        detail: "Y-Axis",
        kb: ["Y"],
      },
      {
        detail: "Colors",
        kb: ["C"],
      },
      {
        detail: "Chart type",
        kb: ["T"],
      },
    ],
  },
];

const Dialog = () => {
  const { setFocus } = useFocusContext();
  const currentTabId = useAppSelector((state) => state.focus.tabId);
  const currentTab = useAppSelector((state) =>
    currentTabId ? state.tabs.entities[currentTabId] : undefined
  );

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      if (open === false) {
        if (currentTab && currentTab.type === "Results") {
          setFocus("editor", "input", { from: "ShortcutsDialog/useEffect" });
        }
      }
    },
    [setFocus, currentTab]
  );

  return (
    <_Dialog onOpenChange={handleOnOpenChange}>
      <DialogTrigger asChild>
        <div className="mr-2 ml-auto px-2 py-0.5 hover:bg-accent rounded h-fit w-fit opacity-85 hover:opacity-100 focus-visible:ring-0">
          <KeyboardIcon />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {shortcuts.map((x) => (
            <div key={x.section}>
              <h1 className="text-muted-foreground text-sm mb-2">
                {x.section}
              </h1>
              <div className="grid gap-2">
                {x.shortcuts.map(({ detail, kb }) => (
                  <div
                    key={detail}
                    className="grid grid-cols-2 items-center gap-4"
                  >
                    <p className=" text-nowrap">{detail}</p>
                    <BoardKey variant="ghost" characters={kb} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </_Dialog>
  );
};

export default Dialog;

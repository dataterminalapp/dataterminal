import BoardKey from "./boardKey";

const shortcuts: Array<{ kb: Array<string>; detail: string }> = [
  { kb: ["⌘", "B"], detail: "Explorer" },
  { kb: ["⌘", "T"], detail: "New tab" },
  { kb: ["⌘", "E"], detail: "Toggle layout" },
];

export const Guide = () => {
  return (
    <ul className="text-muted-foreground gap-2">
      {shortcuts.map(
        ({ detail, kb }: { detail: string; kb: Array<string> }) => (
          <li key={kb.join("_")} className="pt-2 flex flex-row">
            <p className="w-32">{detail}</p>{" "}
            <BoardKey variant="ghost" characters={kb} />
          </li>
        )
      )}
    </ul>
  );
};

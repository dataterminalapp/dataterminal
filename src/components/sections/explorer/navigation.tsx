import { useAppSelector } from "@/hooks/useRedux";
import BoardKey from "../../utils/shortcuts/boardKey";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const focus = useAppSelector(
    (state) => state.focus.currentFocus?.area === "explorer"
  );

  return (
    <div className="relative h-14 mx-2 lg:mx-6 pt-3 text-muted-foreground">
      {/* First content */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          focus ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="text-center">
          <div className="flex gap-2 w-fit m-auto">
            <BoardKey
              characters={["⌘", "⇧", "F"]}
              className="text-muted-foreground"
            />
          </div>
          <div className="pt-1 text-xs">Search</div>
        </div>
      </div>
      {/* Second content */}
      <div
        className={cn(
          "absolute gap-4 inset-0 flex items-center justify-between transition-opacity duration-300",
          focus ? "opacity-100" : "opacity-0"
        )}
      >
        <div>
          <div className="flex gap-1 items-center justify-center">
            <BoardKey variant="ghost" characters={["↑"]} />
            <BoardKey variant="ghost" characters={["↓"]} />
          </div>
          <div className="pt-1 text-center">Navigation</div>
        </div>
        <div>
          <BoardKey
            variant="ghost"
            characters={["⌘", "B"]}
            className="py-0.5"
          />
          <div className="pt-1 text-center">Close</div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;

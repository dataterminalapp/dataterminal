import SmallTooltip from "@/components/utils/SmallTooltip";
import { Button } from "@/components/ui/button";
import { preventDefault } from "@/components/utils";
import { useAppSelector } from "@/hooks/useRedux";
import { cn } from "@/lib/utils";

const Position = ({ className }: { className?: string }) => {
  const panelId = useAppSelector((state) => state.focus.panelId);
  const position = useAppSelector((state) =>
    panelId ? state.panels.entities[panelId]?.cursorPosition : undefined
  );
  const charactersSelected = useAppSelector((state) =>
    panelId ? state.panels.entities[panelId]?.charactersSelected : undefined
  );
  const layout = useAppSelector((state) =>
    panelId ? state.panels.entities[panelId]?.layout : undefined
  );

  return layout === "IDE" ? (
    <SmallTooltip description={"Position"} asChild>
      <Button
        className={cn(
          className,
          "flex flex-row items-center gap-1 h-5 px-1.5 pr-2 rounded",
          !position && "hidden"
        )}
        onMouseDown={preventDefault}
        variant={"ghost"}
      >
        <div
          className="text-muted-foreground"
          style={{ fontSize: "11px", lineHeight: "14px" }}
        >
          Ln {position?.lineNumber}, Col {position?.column}{" "}
          {charactersSelected && ` (${charactersSelected} selected)`}
        </div>
      </Button>
    </SmallTooltip>
  ) : (
    <></>
  );
};

export default Position;

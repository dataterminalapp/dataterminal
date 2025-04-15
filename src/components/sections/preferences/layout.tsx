import { preferredLayoutChanged } from "@/features/preferences";
import { Checkbox } from "../../ui/checkbox";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { cn } from "@/lib/utils";
import { Layout } from "@/features/panel";
import { useCallback } from "react";
import useAppConfig from "@/hooks/useAppConfig";

const PreferedLayout = ({ className }: { className?: string }) => {
  const layout = useAppSelector((state) => state.preferences.layout);
  const dispatch = useAppDispatch();
  const { saveConfig } = useAppConfig();

  const handleOnClick = useCallback((layout: Layout) => {
    dispatch(preferredLayoutChanged({ layout }));
    saveConfig({
      layout,
    });
  }, []);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-10",
        className
      )}
    >
      <div
        onClick={() => handleOnClick("Terminal")}
        className="relative w-64 h-36 border bg-panel p-5 rounded-lg py-6 hover:outline hover:outline-offset-2 hover:outline-border hover:cursor-pointer"
      >
        <Checkbox
          checked={layout === "Terminal"}
          className="rounded-full absolute right-4 top-4 size-5"
        />
        <h3 className="text-lg font-bold">Terminal</h3>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Optimized for speed and preferred by terminal users
        </p>
      </div>
      <div
        onClick={() => handleOnClick("IDE")}
        className="relative w-64 h-36 border bg-panel p-5 rounded-lg py-6 hover:outline hover:outline-offset-2 hover:outline-border hover:cursor-pointer"
      >
        <Checkbox
          checked={layout === "IDE"}
          className="rounded-full absolute right-4 top-4 size-5"
        />
        <h3 className="text-lg font-bold">Editor</h3>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Ideal for writing longer queries and familiar to traditional IDE users
        </p>
      </div>
    </div>
  );
};

export default PreferedLayout;

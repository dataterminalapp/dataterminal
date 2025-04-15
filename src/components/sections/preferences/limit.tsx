import { Checkbox } from "../../ui/checkbox";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { cn } from "@/lib/utils";
import { preferredLimitChanged } from "@/features/preferences";
import useAppConfig from "@/hooks/useAppConfig";
import { useCallback } from "react";

const PreferedLimit = ({ className }: { className?: string }) => {
  const dispatch = useAppDispatch();
  const { saveConfig } = useAppConfig();
  const limit = useAppSelector((state) => state.preferences.limit);

  const handleOnClick = useCallback((limit: boolean) => {
    dispatch(preferredLimitChanged({ limit }));
    saveConfig({
      limit,
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
        className="relative w-64 h-36 border bg-panel p-5 rounded-lg py-6 hover:outline hover:outline-offset-2 hover:outline-border hover:cursor-pointer"
        onClick={() => handleOnClick(true)}
      >
        <Checkbox
          checked={limit}
          className="rounded-full absolute right-4 top-4 size-5"
        />
        <h3 className="text-lg font-bold">Limit</h3>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Ideal to save resources and avoid those "oops, that's too much data"
          moments.
        </p>
      </div>
      <div
        className="relative w-64 h-36 border bg-panel p-5 rounded-lg py-6 hover:outline hover:outline-offset-2 hover:outline-border hover:cursor-pointer"
        onClick={() => handleOnClick(false)}
      >
        <Checkbox
          checked={!limit}
          className="rounded-full absolute right-4 top-4 size-5"
        />
        <h3 className="text-lg font-bold">No Limit</h3>
        <p className="text-sm text-muted-foreground/60 mt-2">
          Great when you need to dig through every last bit of your data.
        </p>
      </div>
    </div>
  );
};

export default PreferedLimit;

import SmallTooltip from "../../utils/SmallTooltip";
import { Button } from "../../ui/button";
import { cn, formatLatencyorTiming } from "@/lib/utils";
import { preventDefault } from "../../utils";
import { useConnection } from "@/hooks/useConnection";
import { useAppSelector } from "@/hooks/useRedux";

const Latency = ({ className }: { className?: string }) => {
  const { refreshLatency } = useConnection();
  const latency = useAppSelector((state) => state.workspace.latency);

  return latency ? (
    <SmallTooltip description={"Latency"} asChild>
      <Button
        className={cn(
          className,
          "flex flex-row items-center gap-1 h-5 px-1.5 pr-2 rounded"
        )}
        onClick={refreshLatency}
        onMouseDown={preventDefault}
        variant={"ghost"}
      >
        <div
          className="text-muted-foreground"
          style={{ fontSize: "11px", lineHeight: "14px" }}
        >
          {formatLatencyorTiming(latency)}
        </div>
      </Button>
    </SmallTooltip>
  ) : (
    <></>
  );
};

export default Latency;

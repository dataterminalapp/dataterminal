import { cn } from "@/lib/utils";
import { useAppSelector } from "@/hooks/useRedux";

const Status = ({
  className,
  extended,
}: {
  className?: string;
  extended?: boolean;
}) => {
  const { loading, connected, error } = useAppSelector(
    (state) => state.workspace.connection
  );

  return (
    <div
      className={cn(
        className,
        extended && "ml-auto flex flex-row items-center px-1 gap-2"
      )}
    >
      {extended ? (
        <div
          className={cn(
            connected && "bg-green-400/10",
            loading && "bg-muted/10",
            error && "bg-red-400/10",
            "p-1 rounded-full"
          )}
        >
          <div
            className={cn(
              connected && "bg-green-400",
              loading && "bg-muted",
              error && "bg-red-400",
              !loading && !connected && !error && "border",
              "rounded-full bg-opacity-50 size-1.5"
            )}
          />
        </div>
      ) : (
        <div
          className={cn(
            connected && "bg-green-500",
            loading && "bg-muted",
            error && "bg-red-500",
            !loading && !connected && !error && "border",
            "rounded-full bg-opacity-50 size-1.5"
          )}
        />
      )}
      {extended && loading && <p>Connecting</p>}
      {extended && !loading && connected && <p>Connected</p>}
      {extended && !loading && !connected && <p>Not connected</p>}
    </div>
  );
};

export default Status;

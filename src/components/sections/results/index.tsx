import { useMemo } from "react";
import { cn } from "@/lib/utils";
import Error, {
  isSevere,
  QueryErrorHighlighter,
} from "../../sections/code/error";
import Command from "./command";
import Dropdown from "./dropdown";
import { useAppSelector } from "@/hooks/useRedux";
import { isResultSelected } from "@/features/panel";
import { useResultContext } from "@/contexts/result";
import { TRANSACTION_STATE } from "@/features/transactions";
import Analyze from "./analyze";
import { stopPropagation } from "../../utils";
import { Timing } from "@/components/table";

interface Props {
  className?: string;
}

const TransactionIndicator = (): JSX.Element => {
  const { transactionId } = useResultContext();
  const transactionState = useAppSelector((state) =>
    transactionId
      ? state.transactions.entities[transactionId]?.uiState.state
      : undefined
  );

  return transactionId ? (
    <div
      className={cn(
        "w-1.5 shrink-0",
        transactionState === TRANSACTION_STATE.RUNNING &&
          "bg-muted-foreground/30",
        transactionState === TRANSACTION_STATE.ENDED_SUCCESSFUL &&
          "bg-green-400/50",
        transactionState === TRANSACTION_STATE.ERROR && "bg-red-800",
        transactionState === TRANSACTION_STATE.ENDED_ERROR && "bg-red-900"
      )}
    />
  ) : (
    <></>
  );
};

const CodeAndTable = (): JSX.Element => {
  const { id, panelId, sql, analyze, error } = useResultContext();
  const isFocused = useAppSelector((state) => {
    const historyIndex = state.panels.entities[panelId]?.historyIndex;
    if (typeof historyIndex === "number") {
      return (
        state.panels.entities[panelId]?.resultIds[
          state.panels.entities[panelId]?.resultIds.length - historyIndex - 1
        ] === id
      );
    } else {
      return undefined;
    }
  });
  const data = useAppSelector((state) => state.results.entities[id].data);

  const errorIsSevere = useMemo(
    () =>
      error?.databaseError?.severity
        ? isSevere(error.databaseError.severity)
        : false,
    [error?.databaseError?.severity]
  );

  const errorPosition = error && error.databaseError?.position;
  const errorOrNoticeMessage = error?.databaseError || (data && data.notice);
  const containsRows = data && data.rows.length > 0 && data.rows[0].length > 0;

  return (
    <div className={cn(containsRows ? "mb-2" : "mb-5", "overflow-hidden pr-6")}>
      <div className="overflow-hidden">
        <div className="flex items-center">
          {sql &&
            (errorPosition ? (
              <QueryErrorHighlighter
                errorPosition={Number(errorPosition)}
                errorMessage={error.message}
              />
            ) : (
              <code
                className={cn(
                  "text-xs py-0.5 text-muted-foreground/50 whitespace-pre font-mono select-text",
                  isFocused && "text-muted-foreground"
                )}
                onMouseDown={stopPropagation}
              >
                {sql}
              </code>
            ))}
          {!sql && <div />}
        </div>
        <div className={cn("w-full")}>
          {errorOrNoticeMessage && (
            <Error message={errorOrNoticeMessage} className="mt-1" />
          )}
          {errorIsSevere ? (
            <Timing className="mt-1" />
          ) : (
            <div className={cn("flex flex-row gap-4 overflow-hidden")}>
              {analyze && (
                <div className="pt-8 mt-0.5 min-w-64">
                  <Analyze />
                </div>
              )}
              <Command data={data} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Result = ({ className }: Props): JSX.Element => {
  const { id, panelId } = useResultContext();
  const focused = useAppSelector((state) =>
    isResultSelected(state.panels, panelId, id)
  );

  return (
    <div
      className={cn(
        "flex flex-row transition-all relative",
        className,
        "rounded-lg relative",
        focused && "bg-accent/15"
      )}
    >
      <TransactionIndicator />
      <div
        className="flex flex-row overflow-hidden gap-2"
        id={"container_" + id}
      >
        <Dropdown />
        <CodeAndTable />
      </div>
    </div>
  );
};

export default Result;

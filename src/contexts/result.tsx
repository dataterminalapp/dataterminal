import { Result } from "@/features/result";
import { collectNodeTypes, parsePlan, PlanDetails } from "@/lib/utils";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";

type StaticResult = Pick<
  Result,
  "id" | "panelId" | "sql" | "timing" | "analyze" | "transactionId" | "error"
>;

type ResultContextType = StaticResult & {
  plans: {
    planArray: Array<PlanDetails>;
    planCounter: Record<string, number>;
    plansDic: Record<string, Array<PlanDetails>>;
    sortedPlanTypes: Array<{
      type: string;
      count: number;
      totalCost: number;
    }>;
  };
};
const ResultContext = createContext<ResultContextType | null>(null);

export function ResultProvider({
  result,
  children,
}: PropsWithChildren & { result: StaticResult }) {
  const plans = useMemo(() => {
    const parsedPlan = parsePlan(result.analyze);
    return collectNodeTypes(parsedPlan ? [parsedPlan] : []);
  }, [result.analyze]);
  const memo = useMemo(
    () => ({
      ...result,
      plans,
    }),
    [result, plans]
  );
  return (
    <ResultContext.Provider value={memo}>{children}</ResultContext.Provider>
  );
}

export function useResultContext() {
  const context = useContext(ResultContext);
  if (!context) {
    throw new Error("useResultContext must be used within a ResultProvider");
  }
  return context;
}

import SmallTooltip from "@/components/utils/SmallTooltip";
import { useResultContext } from "@/contexts/result";
import {
  planFadeDisabled,
  planFadeEnabled,
  planTypeSubIndexUpdated,
  planTypeSelectedUpdated,
} from "@/features/result";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import {
  parsePlan,
  cn,
  formatLatencyorTiming,
  formatRowCount,
} from "@/lib/utils";
import { FunnelIcon, MapIcon } from "@heroicons/react/24/outline";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LapTimerIcon,
  RowsIcon,
  TableIcon,
  WidthIcon,
} from "@radix-ui/react-icons";
import { ArrowUpDown, AtSignIcon, DollarSign, Hash } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";

const Cost = () => {
  const { analyze } = useResultContext();
  const parsedPlan = parsePlan(analyze);
  const totalCost = parsedPlan?.Plan["Total Cost"];
  const startupCost = parsedPlan?.Plan["Startup Cost"];

  if (typeof totalCost === "number" || typeof startupCost === "number") {
    return (
      <div>
        {startupCost} .. {totalCost}
      </div>
    );
  } else {
    return <></>;
  }
};

const PlanCard = (): JSX.Element => {
  const { id, plans: plansCollection } = useResultContext();
  const dispatch = useAppDispatch();
  const { plansDic } = plansCollection;
  const planTypeSelected = useAppSelector(
    (state) => state.results.entities[id].uiState.planTypeSelected
  );
  const planTypeSubIndexSelected = useAppSelector(
    (state) => state.results.entities[id].uiState.planTypeSubIndexSelected
  );

  const fadeEnabled = useAppSelector(
    (state) => state.results.entities[id]?.uiState.planFadeEnabled
  );

  const plans = useMemo(() => {
    if (planTypeSelected) {
      return plansDic[planTypeSelected].sort((a, b) => {
        const costA = a["Independent Cost"] ?? 0;
        const costB = b["Independent Cost"] ?? 0;
        return costB - costA;
      });
    } else {
      return [];
    }
  }, [plansDic, planTypeSelected]);

  const plan =
    typeof planTypeSubIndexSelected === "number"
      ? plans[planTypeSubIndexSelected]
      : undefined;

  const hasNextPlan = planTypeSubIndexSelected !== plans.length - 1;
  const hasPreviousPlan = planTypeSubIndexSelected !== 0;

  // Handle fade effect
  useEffect(() => {
    if (planTypeSelected && fadeEnabled) {
      setTimeout(() => dispatch(planFadeDisabled({ id })), 500);
    } else if (!planTypeSelected && !fadeEnabled) {
      dispatch(planFadeEnabled({ id }));
    }
  }, [fadeEnabled, planTypeSelected]);

  const onIncreaseClick = useCallback(() => {
    if (planTypeSelected && hasNextPlan) {
      dispatch(
        planTypeSubIndexUpdated({
          id,
          planTypeSubIndex: (planTypeSubIndexSelected || 0) + 1,
        })
      );
    }
  }, [planTypeSelected, planTypeSubIndexSelected, hasNextPlan, dispatch, id]);

  const onDecreaseClick = useCallback(() => {
    if (planTypeSelected && hasPreviousPlan) {
      dispatch(
        planTypeSubIndexUpdated({
          id,
          planTypeSubIndex: (planTypeSubIndexSelected || 1) - 1,
        })
      );
    }
  }, [
    planTypeSelected,
    planTypeSubIndexSelected,
    hasPreviousPlan,
    dispatch,
    id,
  ]);

  return planTypeSelected && typeof planTypeSubIndexSelected === "number" ? (
    <>
      <div className="flex flex-row">
        <p className="mb-2 text-sm">Plan estimations</p>
        {plans.length > 1 && (
          <p className="text-muted-foreground ml-auto tracking-widest">
            {planTypeSubIndexSelected + 1}/{plans.length}
          </p>
        )}
      </div>
      <ul className="flex-1">
        {plan && (
          <>
            <SmallTooltip description={"Cost"} asChild>
              {/* w-fit is important to center the tooltip */}
              <li className="flex flex-row gap-2 mt-1.5 items-center w-fit">
                <DollarSign className="stroke-muted-foreground/50 min-size-4 size-4 flex-nowrap" />{" "}
                {(plan["Independent Cost"] || 0).toFixed(2)}{" "}
                {`(${(plan["Relative Cost"] || 0).toFixed(2)}%)`}
              </li>
            </SmallTooltip>
            <SmallTooltip description={"Rows"} asChild>
              <li className="flex flex-row gap-2 mt-1.5 items-center w-fit">
                <RowsIcon className="text-muted-foreground/50 min-size-4 size-4 flex-nowrap stroke-1" />{" "}
                {plan["Plan Rows"]}
              </li>
            </SmallTooltip>
            <SmallTooltip description={"Row size"} asChild>
              <li className="flex flex-row gap-2 mt-1.5 items-center w-fit">
                <WidthIcon className="text-muted-foreground/50 min-size-4 size-4 flex-nowrap stroke-1" />{" "}
                {plan["Plan Width"]} bytes
              </li>
            </SmallTooltip>
            {plan["Relation Name"] && (
              <SmallTooltip description={"Relation name"} asChild>
                <li className="flex flex-row gap-2 mt-1.5 items-center w-fit">
                  <TableIcon className="text-muted-foreground/50 min-size-4 size-4 flex-nowrap stroke-1" />{" "}
                  {plan["Relation Name"]}
                </li>
              </SmallTooltip>
            )}
            {plan["Alias"] && plan["Alias"] !== plan["Relation Name"] && (
              <SmallTooltip description={"Alias"} asChild>
                <li className="flex flex-row gap-2 mt-1.5 items-center w-fit">
                  <AtSignIcon className="stroke-muted-foreground/50 min-size-4 size-4 flex-nowrap" />{" "}
                  {plan["Alias"]}
                </li>
              </SmallTooltip>
            )}
            {plan["Join Filter"] && (
              <SmallTooltip description={"Join filter"} asChild>
                <li className="flex flex-row gap-2 mt-1.5 items-center w-fit max-w-full truncate">
                  <FunnelIcon className="stroke-muted-foreground/50 min-size-4 size-4 flex-nowrap" />
                  <code className="truncate font-mono">
                    {plan["Join Filter"]}
                  </code>
                </li>
              </SmallTooltip>
            )}
            {plan["Sort Key"] && (
              <SmallTooltip description={"Sort key"} asChild>
                <li className="flex flex-row gap-2 mt-1.5 items-center w-fit max-w-full truncate">
                  <ArrowUpDown className="stroke-muted-foreground/50 min-size-4 size-4 flex-nowrap" />
                  <code className="truncate font-mono">
                    {plan["Sort Key"].join(", ")}
                  </code>
                </li>
              </SmallTooltip>
            )}
            {plan["Hash Cond"] && (
              <SmallTooltip description={"Hash condition"} asChild>
                <li className="flex flex-row gap-2 mt-1.5 items-center w-fit max-w-full truncate">
                  {/* Funnel icon from Heroicons */}
                  <Hash className="stroke-muted-foreground/50 min-size-4 size-4 flex-nowrap" />
                  <code className="truncate font-mono">
                    {plan["Hash Cond"]}
                  </code>
                </li>
              </SmallTooltip>
            )}
          </>
        )}
      </ul>
      {plans.length > 1 && (
        <div className="flex flex-row">
          <SmallTooltip
            disabled={!hasPreviousPlan}
            disableHoverableContent
            description={"Previous plan"}
            className={cn(
              "group p-0.5 hover:bg-muted-foreground/20 rounded stroke-muted-foreground/50 hover:stroke-primary",
              !hasPreviousPlan &&
                "hover:bg-transparent hover:stroke-muted-foreground/20 stroke-muted-foreground/20"
            )}
            onClick={onDecreaseClick}
          >
            <ChevronLeftIcon className="stroke-inherit outline-none focus:outline-none size-4" />
          </SmallTooltip>
          <SmallTooltip
            disabled={!hasNextPlan}
            disableHoverableContent
            description={"Next plan"}
            className={cn(
              "group p-0.5 hover:bg-muted-foreground/20 rounded ml-auto stroke-muted-foreground/50 hover:stroke-primary",
              !hasNextPlan &&
                "hover:bg-transparent hover:stroke-muted-foreground/20 stroke-muted-foreground/20"
            )}
            onClick={onIncreaseClick}
          >
            <ChevronRightIcon className="outline-none focus:outline-none size-4" />
          </SmallTooltip>
        </div>
      )}
    </>
  ) : (
    <></>
  );
};

const Plan = () => {
  const { id, plans: plansCollection } = useResultContext();
  const dispatch = useAppDispatch();
  const { plansDic: plans, sortedPlanTypes } = plansCollection;
  const planTypeSelected = useAppSelector(
    (state) => state.results.entities[id].uiState.planTypeSelected
  );
  return (
    <>
      {sortedPlanTypes.map(({ type }) => (
        <button
          key={"plan_label_" + type}
          className={cn(
            "relative p-1 rounded-lg text-nowrap px-1 py-0.5 bg-muted-foreground/20 text-primary",
            planTypeSelected === type && "bg-primary text-accent"
          )}
          onClick={() =>
            dispatch(planTypeSelectedUpdated({ id, planType: type }))
          }
        >
          {plans[type].length > 1 && (
            <div
              style={{ fontSize: "8px" }}
              className="bg-black/30 text-white absolute -top-2 -right-2 rounded-full p-0.5 px-1.5"
            >
              {plans[type].length}
            </div>
          )}
          {type}
        </button>
      ))}
    </>
  );
};

const QueryLatency = (): JSX.Element => {
  const { timing, id } = useResultContext();
  const error = useAppSelector((state) => state.results.entities[id].error);
  const data = useAppSelector((state) => state.results.entities[id].data);
  const searchEnabled = useAppSelector(
    (state) =>
      (state.focus.currentFocus?.area === "result" &&
        state.focus.currentFocus.target === "search" &&
        state.focus.currentFocus.id === id) ||
      typeof state.results.entities[id].uiState.searchFilter === "string"
  );
  const containsRows = data && data.rows.length > 0 && data.rows[0].length > 0;

  if (typeof timing === "undefined") {
    return <></>;
  }

  return (
    <SmallTooltip description={"Query latency"} asChild>
      <p
        className={cn(
          "text-muted-foreground font-light w-fit",
          !searchEnabled && !error && containsRows && "-translate-y-7",
          searchEnabled && "hidden",
          !containsRows && "pt-1.5"
        )}
        style={{ fontSize: "11px" }}
      >
        {formatLatencyorTiming(timing)}
      </p>
    </SmallTooltip>
  );
};

const Analyze = (): JSX.Element => {
  const { timing, id, analyze } = useResultContext();
  const error = useAppSelector((state) => state.results.entities[id].error);
  const data = useAppSelector((state) => state.results.entities[id].data);
  const searchEnabled = useAppSelector(
    (state) =>
      (state.focus.currentFocus?.area === "result" &&
        state.focus.currentFocus.target === "search" &&
        state.focus.currentFocus.id === id) ||
      typeof state.results.entities[id].uiState.searchFilter === "string"
  );
  const rowsCount = data && data.rows.length;
  const containsRows = rowsCount && data.rows[0].length > 0;

  if (!analyze) {
    return <QueryLatency />;
  } else {
    return (
      <ul
        className={cn(
          "text-muted-foreground transition-transform duration-75 w-fit ",
          !searchEnabled && !error && containsRows && "-translate-y-7",
          "max-[350px]:-translate-y-7 max-w-full",
          searchEnabled && "pt-1.5",
          !containsRows && "pt-1.5"
        )}
      >
        {typeof timing === "number" && (
          <li className="flex flex-row gap-2 items-center">
            <LapTimerIcon className="text-muted-foreground/50" />{" "}
            {formatLatencyorTiming(timing)}
          </li>
        )}
        {
          <li className="flex flex-row gap-2 items-center mt-1.5">
            <RowsIcon className="text-muted-foreground/50" />{" "}
            {`${formatRowCount(rowsCount)}`}
          </li>
        }
        <li className="flex flex-row gap-2 items-center mt-1.5">
          <DollarSign className="text-muted-foreground/50 size-4" />
          <Cost />
        </li>
        <li className="flex flex-row gap-2 mt-1.5 flex-wrap items-center">
          {/* Map icon */}
          <MapIcon className="size-4 stroke-muted-foreground/50 flex-nowrap" />
          <Plan />
        </li>
        <PlanCard />
      </ul>
    );
  }
};

export default Analyze;

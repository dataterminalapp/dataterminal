import { useResultContext } from "@/contexts/result";
import { useMemo } from "react";
import { useAppSelector } from "./useRedux";
import orderBy from "lodash/orderBy";

/**
 * A custom hook used exclusively by tables to sort data rows based on the current sorting state.
 */
export const useSortedData = (rows: Array<Array<unknown>>) => {
  const { id: resultId } = useResultContext();
  const sort = useAppSelector(
    (state) => state.results.entities[resultId]?.uiState?.sort
  );

  const sortedRows = useMemo(() => {
    if (!sort || !rows) return rows;

    const { column: columnIndex, type } = sort;
    const order = type === "asc" ? "asc" : "desc";

    return orderBy(rows, [(row: Array<unknown>) => row[columnIndex]], [order]);
  }, [sort, rows]);

  return sortedRows;
};

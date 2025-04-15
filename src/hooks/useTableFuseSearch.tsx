import { useResultContext } from "@/contexts/result";
import Fuse from "fuse.js";
import { useMemo } from "react";
import { useAppSelector } from "./useRedux";

/**
 * A custom hook used exclusively by tables to use fuse search over data rows based on the table's search filter.
 */
export const useTableFuseSearch = (rows: Array<Array<unknown>>) => {
  const { id: resultId } = useResultContext();
  const filter = useAppSelector(
    (state) => state.results.entities[resultId].uiState.searchFilter
  );

  const fuse = useMemo(() => {
    const formattedRows = rows.map((row, index) => ({
      id: index,
      content: row.join(" "),
    }));

    return new Fuse(formattedRows, {
      threshold: 0.4,
      includeMatches: true,
      keys: ["content"],
    });
  }, [rows]);

  // Perform the search
  const filteredRows = useMemo(() => {
    if (fuse && filter && filter.trim() !== "") {
      const searchResults = fuse.search(filter);
      return searchResults.map((result) => rows[result.item.id]);
    }

    return rows;
  }, [fuse, filter, rows]);

  return filteredRows;
};

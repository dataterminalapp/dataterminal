import React, { MouseEventHandler, useCallback, useEffect } from "react";
import "./resizer.css";

import { Table as TTable } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import SmallTooltip from "@/components/utils/SmallTooltip";
import { useAppDispatch } from "@/hooks/useRedux";
import { paginationUpdated } from "@/features/result";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationEditableIndex,
  PaginationNext,
  PaginationLast,
  PaginationFirst,
} from "../ui/pagination";
import { useResultContext } from "@/contexts/result";
import { preventDefault } from "../utils";

export function TablePagination<TData>({
  focus,
  table,
}: {
  focus: boolean;
  table: TTable<TData>;
  fetchMoreData?: () => void;
}) {
  const { id: resultId } = useResultContext();
  const dispatch = useAppDispatch();
  const pageIndex = table.getState().pagination.pageIndex + 1;

  /**
   * Keep the pagination index updated.
   */
  useEffect(() => {
    dispatch(
      paginationUpdated({
        id: resultId,
        index: table.getState().pagination.pageIndex,
      })
    );
  }, [resultId, table.getState().pagination.pageIndex, dispatch]);

  const onValueChange = useCallback((newIndex: number) => {
    table.setPageIndex(newIndex - 1);
  }, []);

  const handleOnPreviousClick: MouseEventHandler<HTMLAnchorElement> =
    useCallback(() => {
      if (table.getCanPreviousPage()) {
        table.previousPage();
      }
    }, [table]);

  const handleOnNextClick = useCallback(() => {
    if (table.getCanNextPage()) {
      table.nextPage();
    }
  }, [table]);

  const handleOnLastPage = useCallback(() => {
    table.lastPage();
  }, [table]);

  const handleOnFirstPage = useCallback(() => {
    table.firstPage();
  }, [table]);

  const onMouseDown: MouseEventHandler = useCallback(preventDefault, []);
  return (
    <Pagination
      className={cn(table.getPageCount() < 2 && "invisible", "justify-between")}
    >
      <PaginationContent className="flex flex-row justify-between w-full">
        <div className="flex flex-row">
          <PaginationItem tabIndex={-1}>
            <SmallTooltip
              disabled={!table.getCanPreviousPage()}
              description="Go to first page"
            >
              <PaginationFirst
                onMouseDown={onMouseDown}
                onClick={handleOnFirstPage}
                size="xs"
                className={cn(
                  !table.getCanPreviousPage() && "stroke-muted",
                  "text-muted-foreground"
                )}
              />
            </SmallTooltip>
          </PaginationItem>
          <PaginationItem tabIndex={undefined}>
            <SmallTooltip
              disabled={!table.getCanPreviousPage()}
              description="Previous page"
              shortcut={focus ? ["⌘", "<"] : undefined}
            >
              <PaginationPrevious
                onMouseDown={onMouseDown}
                tabIndex={undefined}
                onClick={handleOnPreviousClick}
                size="xs"
                className={cn(
                  !table.getCanPreviousPage() && "stroke-muted",
                  "text-muted-foreground"
                )}
              />
            </SmallTooltip>
          </PaginationItem>
        </div>
        <div className="flex flex-row">
          {table.getPageCount() > 1 && (
            <PaginationEditableIndex
              index={pageIndex}
              max={table.getPageCount()}
              onValueChange={onValueChange}
            />
          )}
        </div>
        <div className="flex flex-row">
          <>
            <PaginationItem tabIndex={-1}>
              <SmallTooltip
                disabled={!table.getCanNextPage()}
                description="Next page"
                shortcut={focus ? ["⌘", ">"] : undefined}
              >
                <PaginationNext
                  onMouseDown={onMouseDown}
                  onClick={handleOnNextClick}
                  size="xs"
                  className={cn(
                    !table.getCanNextPage() && "stroke-muted",
                    "text-muted-foreground"
                  )}
                />
              </SmallTooltip>
            </PaginationItem>
            <PaginationItem tabIndex={-1}>
              <SmallTooltip
                disabled={!table.getCanNextPage()}
                description="Go to last page"
              >
                <PaginationLast
                  onMouseDown={onMouseDown}
                  onClick={handleOnLastPage}
                  size="xs"
                  className={cn(
                    !table.getCanNextPage() && "stroke-muted",
                    "text-muted-foreground"
                  )}
                />
              </SmallTooltip>
            </PaginationItem>
          </>
        </div>
      </PaginationContent>
    </Pagination>
  );
}

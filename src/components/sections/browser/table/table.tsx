import { Table } from "@/components/table";
import { usePanelContext } from "@/contexts/panel";
import { ResultProvider } from "@/contexts/result";
import { useTabContext } from "@/contexts/tab";
import { useAppSelector } from "@/hooks/useRedux";
import { useCallback, useEffect, useMemo, useRef } from "react";
import useQuery from "@/hooks/useQuery";
import { format } from "@/components/utils/formatter";
import { useToast } from "@/hooks/useToast";
import Loading from "@/components/utils/loading";
import { BaseEntityType } from "@/features/schema";

const BrowserTable = () => {
  /**
   * Contexts
   */
  const { id: tabId } = useTabContext();
  const { id: panelId } = usePanelContext();
  const { backQuery } = useQuery({ panelId });
  const { toast } = useToast();

  /**
   * Selectors
   */
  const tab = useAppSelector((state) => state.tabs.entities[tabId]);
  const results = useAppSelector(
    (state) => state.results.idsByPanelId[panelId]
  );
  const loading = useAppSelector(
    (state) => state.panels.entities[panelId].loading
  );
  const [resultId] = useMemo(
    () => (results ? Object.keys(results) : []),
    [results]
  );
  const sql = useAppSelector((state) => state.results.entities[resultId]?.sql);
  const timing = useAppSelector(
    (state) => state.results.entities[resultId]?.timing
  );
  const error = useAppSelector(
    (state) => state.results.entities[resultId]?.error
  );
  const rows = useAppSelector(
    (state) => state.results.entities[resultId]?.data?.rows
  );
  const fields = useAppSelector(
    (state) => state.results.entities[resultId]?.data?.fields
  );

  const entity = tab.options.browser?.entity;

  /**
   * Memos
   */
  const primaryKeys = useMemo(() => {
    const primaryKeys: Array<{
      index: number;
      name: string;
      type: string;
    }> = [];

    if (
      entity &&
      (entity.type === BaseEntityType.Table ||
        entity.type === BaseEntityType.View)
    ) {
      entity.children.forEach((x, index) => {
        if (x.key?.type === "PRIMARY") {
          primaryKeys.push({
            index,
            type: x.columnType,
            name: x.name,
          });
        }
      });
    }

    return primaryKeys;
  }, [entity]);
  const editable = primaryKeys.length > 0;

  /**
   * References
   */
  const containerRef = useRef<HTMLDivElement>(null);
  const hasQueryRunRef = useRef<boolean>(false);

  /**
   * Callbacks
   */
  const loadEntity = useCallback(async () => {
    if (
      entity &&
      (entity.type === BaseEntityType.Table ||
        entity.type === BaseEntityType.View)
    ) {
      try {
        try {
          await backQuery(
            format(
              "SELECT * FROM %I.%I LIMIT 1000",
              entity.schema,
              entity.name
            ),
            "querying entity"
          );
        } catch {
          toast({
            title: "Error formatting query",
          });
        }
      } catch (err) {
        console.error("Error: ", err);
      }
    }
  }, [entity, backQuery, toast]);

  /**
   * Effects
   */
  useEffect(() => {
    const asyncReq = async () => {
      // Run query only once.
      const hasQueryRun = hasQueryRunRef.current;
      if (hasQueryRun === false) {
        hasQueryRunRef.current = true;
        loadEntity();
      }
    };

    asyncReq();
  }, [loadEntity]);

  return (
    <div ref={containerRef} className="h-full max-h-full overflow-hidden">
      {loading && (
        <div className="flex flex-col h-full w-full">
          <div className="h-full w-full rounded mb-10 relative">
            <Loading />
          </div>
        </div>
      )}

      {fields && resultId && rows && (
        <ResultProvider
          result={{
            id: resultId,
            panelId,
            sql,
            timing,
            error,
          }}
        >
          {
            <Table
              columns={fields}
              data={rows}
              hideTiming
              fullHeight
              previewSearch
              rowMarkers={
                editable
                  ? {
                      kind: "both",
                      checkboxStyle: "square",
                      theme: {
                        markerFontStyle: "12px mono",
                        textDark: "#959595",
                        textLight: "#959595",
                      },
                    }
                  : "number"
              }
              editable={false}
            />
          }
        </ResultProvider>
      )}
    </div>
  );
};

export default BrowserTable;

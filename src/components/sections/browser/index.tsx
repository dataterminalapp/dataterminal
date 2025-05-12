import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import NavBar from "@/components/layout/navbar";
import { useTabContext } from "@/contexts/tab";
import { BaseEntityType } from "@/features/schema";
import TableBrowser from "./table";
import SchemaBrowser from "./schema";
import { cn } from "@/lib/utils";
import { tabBrowserOptionsChanges } from "@/features/tabs";
import { resultRemoved as panelResultRemoved } from "@/features/panel";
import { resultRemoved } from "@/features/result";
import { usePanelContext } from "@/contexts/panel";
import Select from "./select";

const Browser = () => {
  const { id: tabId } = useTabContext();
  const { id: panelId } = usePanelContext();
  const dispatch = useAppDispatch();

  /**
   * Selectors / memo
   */
  const connectionIds = useAppSelector((state) => state.connections.ids);
  const tab = useAppSelector((state) => state.tabs.entities[tabId]);
  const entity = tab.options.browser?.entity;
  const connection = tab.options.browser?.connection;
  const schemaId = useAppSelector((state) =>
    entity ? state.schema.relationships.byChild[entity.id] : undefined
  );
  const schema = useAppSelector((state) =>
    schemaId ? state.schema.schemas.entities[schemaId] : undefined
  );
  const results = useAppSelector(
    (state) => state.results.idsByPanelId[panelId]
  );
  const [resultId] = useMemo(
    () => (results ? Object.keys(results) : []),
    [results]
  );

  const isTableOrView =
    entity?.type === BaseEntityType.Table ||
    entity?.type === BaseEntityType.View;

  const isConnectionDeleted =
    typeof connectionIds.find((x) => x === connection?.id) === "undefined";

  const items = useMemo(() => {
    const items = [];
    if (connection) {
      items.push(connection.name);
    }

    if (
      entity &&
      (entity.type === BaseEntityType.Table ||
        entity.type === BaseEntityType.View)
    ) {
      if (entity?.database) {
        items.push(entity.database);
      }
      if (entity?.schema) {
        items.push(entity.schema);
      }
      if (entity?.name) {
        items.push(entity.name);
      }
    } else if (entity?.type === BaseEntityType.Schema) {
      items.push(entity.database);
      items.push(entity.name);
    }
    return items;
  }, [connection, entity]);

  const navigateBack = useCallback(() => {
    if (
      entity &&
      (entity.type === BaseEntityType.Table ||
        entity?.type === BaseEntityType.View)
    ) {
      if (schema) {
        dispatch(panelResultRemoved({ panelId, resultId }));
        dispatch(resultRemoved({ id: resultId, panelId }));
        dispatch(
          tabBrowserOptionsChanges({
            tabId,
            schemaEntity: schema,
          })
        );
      }
    }
  }, [dispatch, entity, parent, panelId, resultId]);

  return (
    <div className="flex flex-col h-full max-h-full overflow-y-auto">
      <NavBar
        items={items}
        tabType={"Browser"}
        className={
          isConnectionDeleted ? "line-through decoration-muted-foreground" : ""
        }
        onBack={isTableOrView ? navigateBack : undefined}
      />

      {/* Try to always match explorer padding. */}
      <div
        className={cn(
          "relative h-full max-h-full flex flex-col gap-3 p-2 px-4 md:px-20 md:ml-1.5",
          isTableOrView && "overflow-hidden"
        )}
      >
        {entity?.type === BaseEntityType.Schema && (
          <Select schema={entity} className="absolute right-20 mr-2 top-6" />
        )}
        {isTableOrView && <TableBrowser key={entity.id} />}
        {entity?.type === BaseEntityType.Schema && (
          <SchemaBrowser className="pb-10 pt-4" />
        )}
      </div>
    </div>
  );
};

export default Browser;

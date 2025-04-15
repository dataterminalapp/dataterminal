import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PropsWithChildren, useCallback } from "react";
import { preventDefaultAndStopPropagation, stopPropagation } from "../utils";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { focusChanged } from "@/features/focus";
import { panelAdded } from "@/features/panel";
import { tabAdded } from "@/features/tabs";
import { searchOpenChanged } from "@/features/global";
import { useFocusContext } from "@/contexts/focus";
import { SchemaTable, SchemaView } from "@/features/schema";
import NoDataComponent from "../sections/connections/nodata";

export function SearchDialog(props: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const connectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );
  const connection = useAppSelector(
    (state) => connectionId && state.connections.entities[connectionId]
  );
  const loading = useAppSelector(
    (state) =>
      state.workspace.schema.loading || state.workspace.connection.loading
  );
  const tables = useAppSelector((state) => state.schema.tables.entities);
  const views = useAppSelector((state) => state.schema.views.entities);
  const viewsIds = useAppSelector((state) => state.schema.views.ids);
  const open = useAppSelector((state) => state.global.openSearch);
  const browserTabsOpened = useAppSelector(
    (state) =>
      Object.values(state.tabs.entities).filter((tab) => tab.type === "Browser")
        .length > 0
  );
  const { restoreFocus } = useFocusContext();

  const onOpenChange = useCallback(
    (open: boolean) => {
      dispatch(searchOpenChanged(open));
    },
    [dispatch]
  );

  const onTableSelect = useCallback(
    (entity: SchemaTable | SchemaView) => {
      if (connection) {
        const panelAddedResult = dispatch(
          panelAdded({ layout: "Terminal", limit: false })
        );
        const tabAddedResult = dispatch(
          tabAdded("Browser", {
            browser: {
              connection,
              entity,
            },
            panelIds: [panelAddedResult.payload.id],
          })
        );
        dispatch(
          focusChanged({
            tabId: tabAddedResult.payload.id,
            panelId: tabAddedResult.payload.options.panelIds[0],
          })
        );
      }
      dispatch(searchOpenChanged(false));
    },
    [dispatch, connection, browserTabsOpened]
  );

  const onCloseAutoFocus = useCallback((e: Event) => {
    preventDefaultAndStopPropagation(e);
    restoreFocus("header/searchDialog");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent
        aria-describedby="Search Dialog"
        onKeyDown={stopPropagation}
        className="bg-panel sm:max-w-xl p-0 gap-0 border-0"
        tabIndex={-1}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogDescription />
        <DialogTitle />
        <Command className="rounded-lg border shadow-md md:min-w-[450px] outline-none bg-panel">
          <CommandInput placeholder="Search database..." />
          <CommandList className="h-80 max-h-80">
            <CommandEmpty className="pt-10 h-80 flex flex-col justify-center overflow-hidden">
              <NoDataComponent message="Nothing found" />
            </CommandEmpty>
            {tables && Object.values(tables).length > 0 && !loading && (
              <CommandGroup heading="Tables">
                {Object.values(tables).map((table) => (
                  <CommandItem
                    key={table.schema + "_table_" + table.id}
                    value={table.id}
                    onSelect={() => onTableSelect(table)}
                    keywords={[table.name, table.schema]}
                  >
                    {table.name}
                    <span className="ml-auto pr-2 text-muted-foreground/80">
                      {table.schema}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {viewsIds.length > 0 && !loading && (
              <CommandGroup heading="Views">
                {viewsIds.map((viewId) => (
                  <CommandItem
                    key={"view_" + viewId}
                    value={viewId}
                    keywords={[views[viewId]?.name]}
                    onSelect={() => onTableSelect(views[viewId])}
                  >
                    {views[viewId]?.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

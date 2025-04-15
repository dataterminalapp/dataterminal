"use client";

import { useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Database } from "lucide-react";
import BoardKey from "../../utils/shortcuts/boardKey";
import ProviderIcon from "../../icons/providerIcon";
import Status from "./status";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { tabAdded } from "@/features/tabs";
import { focusChanged } from "@/features/focus";
import { useFocusContext } from "@/contexts/focus";
import { GearIcon, SymbolIcon } from "@radix-ui/react-icons";
import SmallTooltip from "../../utils/SmallTooltip";
import NoDataComponent from "./nodata";
import { preventDefaultAndStopPropagation, stopPropagation } from "../../utils";
import {
  manageConnectionsClosed,
  manageConnectionsOpened,
} from "@/features/global";
import { useConnection } from "@/hooks/useConnection";
import { currentDatabaseUpdated } from "@/features/workspace";
import { CircleStackIcon } from "@heroicons/react/24/outline";

const Navigation = () => {
  return (
    <div className="flex gap-2 px-6 pb-2 pt-3 justify-between ml-auto border-t w-full text-muted-foreground">
      <div>
        <div className="flex gap-2">
          <BoardKey variant="ghost" characters={["↑"]} />
          <BoardKey variant="ghost" characters={["↓"]} />
        </div>
        <div className="pt-1 text-center">Navigation</div>
      </div>
      <div>
        <div className="flex justify-center">
          <BoardKey variant="ghost" characters={["Enter"]} />
        </div>
        <div className="pt-1 text-center">Select</div>
      </div>
      <div>
        <div className="flex gap-2">
          <BoardKey variant="ghost" characters={["esc"]} />
        </div>
        <div className="pt-1 text-center">Close</div>
      </div>
    </div>
  );
};

const ConnectionDialog = () => {
  /**
   * Hooks
   */
  const dispatch = useAppDispatch();
  const { setupConnection } = useConnection();
  const reloadConnection = setupConnection;

  /**
   * Contexts
   */
  const { restoreFocus } = useFocusContext();

  /**
   * Selectors
   */
  const databases = useAppSelector((state) => state.workspace.database.list);
  const loadingDatabases = useAppSelector(
    (state) => state.workspace.database.loading
  );
  const open = useAppSelector((state) => state.global.openManageConnections);
  const currentDatabase = useAppSelector(
    (state) => state.workspace.database.current
  );
  const currentConnectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );
  const connectionIds = useAppSelector((state) => state.connections.ids);
  const connectionEntities = useAppSelector(
    (state) => state.connections.entities
  );
  const currentConnection = useAppSelector((state) =>
    currentConnectionId
      ? state.connections.entities[currentConnectionId]
      : undefined
  );

  /**
   * Refs
   */
  const ref = useRef<HTMLDivElement>(null);
  const commandRef = useRef<HTMLInputElement>(null);

  const handleOnConnectionChange = useCallback(
    (connectionId: string) => {
      dispatch(manageConnectionsClosed());
      if (currentConnectionId !== connectionId) {
        const connection = connectionEntities[connectionId];
        if (connection) {
          setupConnection(connection);
        } else {
          console.warn("Connection wasn't found");
        }
      }
    },
    [dispatch, connectionEntities, currentConnectionId]
  );

  const handleOnDatabaseChange = useCallback(
    (database: string) => {
      dispatch(manageConnectionsClosed());
      dispatch(currentDatabaseUpdated({ database }));

      if (currentConnectionId) {
        const connection = connectionEntities[currentConnectionId];
        if (connection) {
          setupConnection(connection, database);
        }
      }
    },
    [dispatch, currentConnectionId, connectionEntities]
  );

  const handleOnManageClick = useCallback(() => {
    const tabAddedResults = dispatch(tabAdded("Connections"));
    dispatch(focusChanged({ tabId: tabAddedResults.payload.id }));
    dispatch(manageConnectionsClosed());
  }, [dispatch, tabAdded]);

  const handleOnReconnectClick = useCallback(() => {
    if (currentConnection) {
      reloadConnection(currentConnection);
    }
    dispatch(manageConnectionsClosed());
  }, [reloadConnection, currentConnection]);

  // It is needed to keep the focus on the search even if the user clicks on the Dialog footer.
  // By clicking on the dialog footer, the focus is lost and the focus will move to the Dialog
  // creating an unexpected effect.
  const handleOnBlur = useCallback(() => {
    if (open) {
      commandRef?.current?.focus();
    }
  }, [open, commandRef]);

  const handleOnOpenChange = useCallback((open: boolean) => {
    if (open) {
      dispatch(manageConnectionsOpened());
    } else {
      dispatch(manageConnectionsClosed());
    }
  }, []);

  const onCloseAutoFocus = useCallback((e: Event) => {
    preventDefaultAndStopPropagation(e);
    restoreFocus("header/searchDialog");
  }, []);

  return (
    <>
      <SmallTooltip
        className="h-5"
        delayDuration={100}
        description={"Change connection"}
        shortcut={["⌘", "O"]}
      >
        <Dialog modal open={open} onOpenChange={handleOnOpenChange}>
          <div className="flex">
            <DialogTrigger
              aria-describedby="Connections Button"
              asChild
              className="hover:bg-accent rounded pl-2 cursor-pointer flex items-center h-full focus-visible:ring-0 focus:ring-0 outline-none focus:outline-none"
            >
              <div ref={ref} className="flex items-center pl-0.5 pr-2 h-5">
                <Status />
                <p
                  style={{ fontSize: "11px", lineHeight: "14px" }}
                  className="px-3 text-muted-foreground text-nowrap max-w-xs truncate"
                >
                  {!currentConnection && "No connection selected"}
                  {currentConnection && currentConnection.name}
                </p>

                {currentDatabase && (
                  <div className="flex items-center pl-0.5 pr-2 h-5">
                    <CircleStackIcon className="size-3.5 stroke-muted-foreground" />
                    <p
                      style={{ fontSize: "11px", lineHeight: "14px" }}
                      className="px-2 pr-0 text-muted-foreground text-nowrap max-w-xs truncate"
                    >
                      {currentDatabase ? `${currentDatabase}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </DialogTrigger>
          </div>
          <DialogContent
            aria-describedby="Connections Dialog"
            className="sm:max-w-xl p-0 gap-0"
            tabIndex={-1}
            onCloseAutoFocus={onCloseAutoFocus}
            // Otherwise causes conflicts in places like manage connections,
            // pressing A would enable to open a create connection.
            onKeyDown={stopPropagation}
          >
            <DialogTitle className="hidden">Connections</DialogTitle>
            {/* Description is needed to avoid warnings in the console. */}
            <DialogDescription />
            <Command
              aria-describedby="Connections"
              onBlur={handleOnBlur}
              className="outline-none bg-panel"
            >
              <CommandInput
                ref={commandRef}
                placeholder="Search connections..."
                className="pr-6"
              />
              <CommandList className="mb-4 h-80 max-h-80">
                <CommandEmpty className="pt-10 h-80 flex flex-col justify-center overflow-hidden">
                  <NoDataComponent message="No connection found" />
                </CommandEmpty>
                <CommandGroup heading="Connections">
                  {connectionIds.map((connectionId) => (
                    <CommandItem
                      key={connectionId + "_ci"}
                      value={connectionId}
                      keywords={[connectionEntities[connectionId]?.name]}
                      onSelect={() => handleOnConnectionChange(connectionId)}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center truncate">
                        <div className="p-1.5 mr-2 rounded bg-zinc-800 shrink-0 border border-zinc-700">
                          <ProviderIcon
                            provider={
                              connectionEntities[connectionId]?.provider
                            }
                            className="size-3.5"
                          />
                        </div>
                        <span className="truncate">
                          {connectionEntities[connectionId]?.name}
                        </span>
                      </div>
                      {currentConnection?.id === connectionId && (
                        <Status extended />
                      )}
                    </CommandItem>
                  ))}
                  <CommandItem
                    keywords={["manage"]}
                    onSelect={handleOnManageClick}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="flex items-center text-xs">
                      <div className="p-1.5 mr-2 shrink-0">
                        <GearIcon
                          strokeWidth={0.5}
                          className="stroke-muted-foreground size-3.5"
                        />
                      </div>
                      <span>Manage Connections</span>
                    </div>
                  </CommandItem>
                  {currentConnection && (
                    <CommandItem
                      keywords={["reconnect"]}
                      onSelect={handleOnReconnectClick}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center text-xs">
                        <div className="p-1.5 mr-2 shrink-0">
                          <SymbolIcon
                            strokeWidth={0.5}
                            className="stroke-muted-foreground size-3.5"
                          />
                        </div>
                        <span>Reconnect</span>
                      </div>
                    </CommandItem>
                  )}
                </CommandGroup>
                {!loadingDatabases && databases.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading={"Databases"}>
                      {databases.map((database) => (
                        <CommandItem
                          key={database}
                          value={database}
                          onSelect={handleOnDatabaseChange}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center text-xs">
                            <div className="p-1.5 mr-2 rounded bg-zinc-800 shrink-0">
                              <Database className="stroke-muted-foreground size-4" />
                            </div>
                            <span>{database}</span>
                          </div>
                          {currentDatabase === database && "Current"}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
            </Command>
            <DialogFooter>
              <Navigation />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SmallTooltip>
    </>
  );
};

export default ConnectionDialog;

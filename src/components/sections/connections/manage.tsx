import {
  MouseEventHandler,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { EllipsisIcon } from "lucide-react";
import ProviderIcon from "../../icons/providerIcon";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import { cn } from "@/lib/utils";
import AddConnection, {
  ADD_CONNECTION_STRING_INPUT_REF_ID,
  handleOnCreateConnection,
} from "./add";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import SmallTooltip from "../../utils/SmallTooltip";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useFocusContext } from "@/contexts/focus";
import BoardKey from "../../utils/shortcuts/boardKey";
import {
  preventDefault,
  preventDefaultAndStopPropagation,
  stopPropagation,
} from "../../utils";
import { useTabContext } from "@/contexts/tab";
import Header from "./header";
import { toast } from "@/hooks/useToast";
import NavBar from "../../layout/navbar";
import {
  connectionRemoved,
  updateConnectionName,
} from "@/features/connections";
import { preferredConnectionChanged } from "@/features/preferences";
import useAppConfig from "@/hooks/useAppConfig";
import { useConnection } from "@/hooks/useConnection";
import {
  tabConnectionCollapsibleChanged,
  tabConnectionCreationCanceled,
} from "@/features/tabs";

export const buildFocusRefId = (id: string, tabId: string) => id + tabId;

const DeleteDialog = ({
  connectionId,
  confirmDelete,
  onOpenChange,
}: {
  connectionId?: string;
  confirmDelete: () => void;
  onOpenChange: () => void;
}): JSX.Element => {
  const connectionToDelete = useAppSelector(
    (state) => connectionId && state.connections.entities[connectionId]
  );
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog open={!!connectionToDelete} onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onOpenChange} className="bg-panel">
        <AlertDialogHeader className="overflow-hidden">
          <AlertDialogTitle>
            Are you sure you want to delete this connection?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-wrap truncate">
            This action cannot be undone. This will permanently delete the
            following connection:
          </AlertDialogDescription>
          <p className="text-wrap truncate">
            {connectionToDelete && ` ${connectionToDelete.name}`}
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel autoFocus ref={noButtonRef} className="bg-panel">
            No
          </AlertDialogCancel>
          <AlertDialogAction
            ref={yesButtonRef}
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-destructive"
          >
            Yes
          </AlertDialogAction>
          <DetectBoardKey
            boardKey="y"
            onKeyPress={() => {
              confirmDelete();
              onOpenChange();
            }}
          />
          <DetectBoardKey boardKey="n" onKeyPress={onOpenChange} />
          <DetectBoardKey
            boardKey="ArrowLeft"
            onKeyPress={() => noButtonRef.current?.focus()}
          />
          <DetectBoardKey
            boardKey="ArrowRight"
            onKeyPress={() => yesButtonRef.current?.focus()}
          />
          <DetectBoardKey
            boardKey="ArrowUp"
            onKeyPress={() => yesButtonRef.current?.focus()}
          />
          <DetectBoardKey
            boardKey="ArrowDown"
            onKeyPress={() => noButtonRef.current?.focus()}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const EditDialog = ({
  connectionId,
  onOpenChange,
}: {
  connectionId: string | undefined;
  onOpenChange: () => void;
}) => {
  const dispatch = useAppDispatch();
  const { saveConfig } = useAppConfig();
  const originalName = useAppSelector(
    (state) => connectionId && state.connections.entities[connectionId]?.name
  );
  const connections = useAppSelector((state) => state.connections.entities);
  const [name, setName] = useState(originalName);
  const [error, setError] = useState<string>();

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setName(e.target.value);
      if (error) setError(undefined); // clear error on input change
    },
    [error]
  );

  const handleOnUpdate = useCallback(() => {
    if (connectionId) {
      if (!name) {
        setError("The connection name must have at least one character.");
      } else {
        dispatch(
          updateConnectionName({
            id: connectionId,
            name,
          })
        );

        // I don't like doing this, but well..
        const newConnections = {
          ...connections,
          [connectionId]: {
            ...connections[connectionId],
            name,
          },
        };
        saveConfig({ connectionList: Object.values(newConnections) });
        onOpenChange();
      }
    }
  }, [name, connectionId, connections, updateConnectionName, onOpenChange]);

  return (
    <Dialog open={!!connectionId} onOpenChange={onOpenChange}>
      <DialogContent
        onCloseAutoFocus={onOpenChange}
        className="sm:max-w-[425px]"
        onKeyDown={(e) => {
          stopPropagation(e);
          if (e.key === "Enter") {
            handleOnUpdate();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>
            Make changes to the connection name here. Click save or press enter
            when you're done.
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="ml-1">
                Name
              </Label>
              <div className="relative">
                <Input
                  onChange={onChange}
                  id="name"
                  value={name}
                  className="col-span-3 pr-7"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              {error && (
                <p className="text-red-500 col-span-4">{error}</p> // Error message display
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <SmallTooltip description={"Save changes and close"} shortcut={["⏎"]}>
            <Button
              onClick={handleOnUpdate}
              type="submit"
              variant={"primary"}
              className="items-center"
            >
              Save changes
            </Button>
          </SmallTooltip>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TableConnections = ({
  handleDeleteConnection,
  handleEditConnection,
  handleOnDefault,
}: {
  handleDeleteConnection: (connectionId: string) => void;
  handleEditConnection: (connectionId: string) => void;
  handleOnDefault: (connectionId: string) => void;
}): JSX.Element => {
  /**
   * Contexts
   */
  const { id: tabId } = useTabContext();
  const { setFocus, getCurrentFocus } = useFocusContext();

  /**
   * Selectors
   */
  const connectionIds = useAppSelector((state) => state.connections.ids);

  const firstConnectionId = connectionIds[0]
    ? buildFocusRefId(connectionIds[0], tabId)
    : undefined;

  const isAddingConnection =
    useAppSelector(
      (state) =>
        state.tabs.entities[tabId]?.options.connection?.isAddingConnection
    ) || connectionIds.length === 0;

  useLayoutEffect(() => {
    const currentFocus = getCurrentFocus();
    const isAddButtonFocused =
      currentFocus?.area === "connection" && currentFocus?.target === "button";
    if (isAddButtonFocused === false || isAddingConnection === false) {
      setFocus("connection", "row", {
        id: firstConnectionId,
        from: "connections/manage/table/useEffect",
      });
    }
  }, [getCurrentFocus, setFocus, firstConnectionId, isAddingConnection]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    preventDefault(event);
    const currentFocus = getCurrentFocus();

    switch (event.key) {
      case "Backspace": {
        const connectionIdToDelete = connectionIds.find(
          (connectionId) =>
            buildFocusRefId(connectionId, tabId) === currentFocus?.id
        );
        if (connectionIdToDelete) {
          handleDeleteConnection(connectionIdToDelete);
        }
        break;
      }
      case "R":
      case "r": {
        const connection = connectionIds.find(
          (connectionId) =>
            buildFocusRefId(connectionId, tabId) === currentFocus?.id
        );
        if (connection) {
          handleEditConnection(connection);
        }
        break;
      }
      case "D":
      case "d": {
        const connection = connectionIds.find(
          (connectionId) =>
            buildFocusRefId(connectionId, tabId) === currentFocus?.id
        );
        if (connection) {
          handleOnDefault(connection);
        }
        break;
      }
      case "ArrowDown": {
        if (currentFocus) {
          const index = connectionIds.findIndex(
            (connectionId) =>
              buildFocusRefId(connectionId, tabId) === currentFocus?.id
          );
          setFocus("connection", "row", {
            id: buildFocusRefId(connectionIds[index + 1], tabId),
            from: "connections/manage/handleKeyDown/ArrowDown",
          });
        }
        break;
      }
      case "ArrowUp": {
        const currentFocus = getCurrentFocus();
        if (currentFocus) {
          const index = connectionIds.findIndex(
            (connectionId) =>
              buildFocusRefId(connectionId, tabId) === currentFocus?.id
          );
          if (index === 0) {
            setFocus("connection", "button", {
              from: "connections/manage/handleKeyDown/ArrowUp",
            });
          } else {
            setFocus("connection", "row", {
              id: buildFocusRefId(connectionIds[index - 1], tabId),
              from: "connections/manage/handleKeyDown/ArrowUp",
            });
          }
        }
        break;
      }
    }
  };

  const handleOnClick: MouseEventHandler<HTMLTableRowElement> = useCallback(
    (e) => {
      setFocus("connection", "row", {
        id: buildFocusRefId(e.currentTarget.id, tabId),
      });
    },
    [tabId]
  );

  return (
    <table className="w-full table-fixed text-left overflow-hidden">
      <colgroup className="max-w-full">
        <col className="w-10/12 sm:w-11/12" />
        <col className="w-2/12 sm:w-1/12" />
      </colgroup>
      <thead className="text-sm leading-6 text-white">
        <tr>
          <th
            scope="col"
            className="py-2 pl-4 pr-8 font-semibold sm:pl-6 lg:pl-8"
          >
            Provider
          </th>
          <th
            scope="col"
            className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-6 lg:pr-8"
          >
            Edit
          </th>
        </tr>
      </thead>
      <tbody className="overflow-auto border-spacing-1">
        {connectionIds.map((connectionId) => (
          <ConnectionTableRow
            connectionId={connectionId}
            handleDeleteConnection={handleDeleteConnection}
            handleEditConnection={handleEditConnection}
            handleKeyDown={handleKeyDown}
            handleOnClick={handleOnClick}
            handleOnDefault={handleOnDefault}
          />
        ))}
      </tbody>
    </table>
  );
};

const ConnectionTableRow = ({
  connectionId,
  handleKeyDown,
  handleOnClick,
  handleDeleteConnection,
  handleEditConnection,
  handleOnDefault,
}: {
  connectionId: string;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleOnClick: MouseEventHandler<HTMLTableRowElement>;
  handleDeleteConnection: (connectionId: string) => void;
  handleEditConnection: (connectionId: string) => void;
  handleOnDefault: (connectionId: string) => void;
}) => {
  const { id: tabId } = useTabContext();
  const { createRef } = useFocusContext();

  const defaultConnectionId = useAppSelector(
    (state) => state.preferences.connectionId
  );
  const connection = useAppSelector(
    (state) => state.connections.entities[connectionId]
  );
  const { provider, name, connectionOptions } = connection;

  return (
    <tr
      key={connectionId}
      id={connectionId}
      // Use the tab id to identify the connection and tab. Otherwise, tabs will have the same ID for the same connection ref and overlap.
      ref={createRef("connection", "row", {
        id: buildFocusRefId(connectionId, tabId),
      })}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleOnClick}
      className={`w-full outline-none hover:bg-zinc-800/50 focus:bg-zinc-800/50`}
    >
      <td className="py-4 pl-4 pr-8 sm:pl-6 lg:pl-8 rounded-l-lg">
        <div className="flex items-center gap-x-4">
          <div className="p-2 shadow shadow-black/50 border rounded bg-zinc-800 border-zinc-700">
            <ProviderIcon
              provider={provider}
              className="size-4 shrink-0 self-start mt-0.5"
            />
          </div>
          <div className="truncate leading-2 text-primary flex flex-col">
            <p>{name}</p>
            <p className="text-zinc-400 font-normal truncate">
              {connectionOptions?.host}
            </p>
          </div>
          {defaultConnectionId === connectionId && (
            <div className="shrink-0 ml-auto mt-0.5 truncate w-fit max-w-full rounded-md px-2 py-1 text-xs font-medium text-zinc-400 bg-zinc-700/40 ring-1 ring-inset ring-white/10">
              Default
            </div>
          )}
        </div>
      </td>
      <td className="table-cell py-4 pl-0 pr-4 text-right leading-6 text-zinc-400 sm:pr-6 lg:pr-8 rounded-r-lg">
        <ConnectionDropdown
          connectionId={connectionId}
          handleOnDelete={handleDeleteConnection}
          handleOnRenaming={handleEditConnection}
          handleOnDefault={handleOnDefault}
        />
      </td>
    </tr>
  );
};

const Navigation = ({ className }: { className?: string }) => {
  const { id: tabId } = useTabContext();

  const focus = useAppSelector(
    (state) => state.focus.currentFocus?.area === "connection"
  );
  const isAddingConnection = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.isAddingConnection
  );
  const isLoading = useAppSelector(
    (state) => state.tabs.entities[tabId]?.loading
  );
  const connectionIds = useAppSelector((state) => state.connections.ids);

  /**
   * If the user is using the manual input,
   * then we disable showing the shortcuts, because the user now has access to cancel/create buttons.
   */
  const isAddingOptionsManually = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.isAddingOptionsManually
  );

  return (
    <div
      className={cn(
        className,
        "relative h-14 mt-auto mx-2 lg:mx-6 pb-1 pt-3 text-muted-foreground",
        isAddingOptionsManually && "hidden",
        isAddingConnection && "hidden",
        !isAddingConnection && connectionIds.length === 0 && "hidden"
      )}
    >
      {/* First content */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          focus ? "opacity-0" : "opacity-100"
        )}
      >
        <div className="text-center">
          <div className="flex gap-2 w-fit m-auto">
            <BoardKey characters={["esc"]} className="text-muted-foreground" />
          </div>
          <div className="pt-1">Select</div>
        </div>
      </div>
      {/* Second content */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          focus ? "opacity-100" : "opacity-0"
        )}
      >
        <div>
          {isAddingConnection ? (
            isLoading ? (
              <></>
            ) : (
              <div className="flex gap-6 w-fit h-fit">
                <div className="w-fit m-auto">
                  <BoardKey characters={["esc"]} className="py-0.5" />
                  <div className="text-center pt-1">Cancel</div>
                </div>
                <div className="w-fit m-auto">
                  <BoardKey characters={["⏎"]} className="py-0.5" />
                  <div className="text-center pt-1">Create</div>
                </div>
              </div>
            )
          ) : (
            <>
              <div className="flex gap-2 pl-1">
                <BoardKey characters={["↑"]} />
                <BoardKey characters={["↓"]} />
              </div>
              <div className="pt-1 text-center">Navigation</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ManageConnections() {
  /**
   * Contexts
   */
  const { id: tabId } = useTabContext();
  const { setFocus, getCurrentFocus, restoreFocus } = useFocusContext();
  const dispatch = useAppDispatch();
  const { saveConfig } = useAppConfig();
  const { setupConnection } = useConnection();

  /**
   * Selectors
   */
  const currentConnectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );
  const connectionIds = useAppSelector((state) => state.connections.ids);
  const isAddingConnection = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.isAddingConnection
  );
  const newConnection = useAppSelector(
    (state) => state.tabs.entities[tabId]?.options.connection?.newConnection
  );
  const connections = useAppSelector((state) => state.connections.entities);
  const defaultConnectionId = useAppSelector(
    (state) => state.preferences.connectionId
  );

  /**
   * States
   */
  const [connectionIdToDelete, setConnectionIdToDelete] = useState<string>();
  const [connectionIdToEdit, setConnectionIdToEdit] = useState<string>();

  /**
   * Refs
   */
  const firstConnectionId = connectionIds[0]
    ? buildFocusRefId(connectionIds[0], tabId)
    : undefined;

  /**
   * Callbacks
   */
  const handleDeleteConnection = useCallback((connectionId: string) => {
    setConnectionIdToDelete(connectionId);
  }, []);

  const handleEditConnection = useCallback((connectionId: string) => {
    setConnectionIdToEdit(connectionId);
  }, []);

  const handleOnDefault = useCallback((connectionId: string) => {
    dispatch(preferredConnectionChanged({ id: connectionId }));
    saveConfig({
      defaultConnectionId: connectionId,
    });
  }, []);

  const confirmDelete = useCallback(() => {
    if (connectionIdToDelete) {
      // Find the index of the connection to delete
      const indexToDelete = connectionIds.findIndex(
        (connectionId) => connectionId === connectionIdToDelete
      );
      // Set the previous element (if it exists) otherwise opt for the next one
      const previousConnectionId =
        connectionIds[indexToDelete - 1] || connectionIds[indexToDelete + 1];

      // Only update the current connection if it's the one being removed
      if (
        currentConnectionId === connectionIdToDelete &&
        previousConnectionId
      ) {
        const previousConnection = connections[previousConnectionId];
        if (previousConnection) {
          setupConnection(previousConnection);

          if (defaultConnectionId === connectionIdToDelete) {
            dispatch(preferredConnectionChanged({ id: previousConnectionId }));
            saveConfig({
              defaultConnectionId: previousConnectionId,
            });
          }
        } else {
          console.warn("Previous connection not found.");
        }
      }

      dispatch(connectionRemoved({ id: connectionIdToDelete }));

      saveConfig({
        connectionList: Object.values(connections).filter(
          (x) => x.id !== connectionIdToDelete
        ),
      });
      setConnectionIdToDelete(undefined);
      setFocus("connection", "row", {
        from: "connections/manage/confirmDelete",
        id: previousConnectionId
          ? buildFocusRefId(previousConnectionId, tabId)
          : undefined,
      });
    }
  }, [
    connections,
    defaultConnectionId,
    connectionIds,
    connectionIdToDelete,
    tabId,
    setFocus,
  ]);

  const handleOnFallBack = useCallback(() => {
    if (getCurrentFocus()?.area !== "connection") {
      if (isAddingConnection) {
        setFocus("connection", "input", {
          id: ADD_CONNECTION_STRING_INPUT_REF_ID,
        });
      } else {
        setFocus("connection", "row", {
          id: firstConnectionId,
          from: "connection/manage/handleOnFallBack",
        });
      }
    }
  }, [getCurrentFocus, isAddingConnection, firstConnectionId, setFocus]);

  const onCreateConnection = useCallback(() => {
    if (!newConnection) return;
    handleOnCreateConnection(
      tabId,
      Object.values(connections),
      newConnection,
      Object.keys(connections).length === 0 ? true : false,
      dispatch,
      toast,
      saveConfig
    );
  }, [tabId, connections, newConnection, dispatch, toast, saveConfig]);

  const onMouseDown: MouseEventHandler = useCallback(preventDefault, []);

  const onBack = useCallback(() => {
    dispatch(tabConnectionCreationCanceled({ tabId }));
    dispatch(tabConnectionCollapsibleChanged({ tabId, open: false }));
  }, [tabId]);

  return (
    <div className="flex flex-col max-h-full h-full w-full overflow-y-auto overflow-x-hidden">
      <NavBar
        items={isAddingConnection ? ["Connect Postgres"] : []}
        tabType={"Connections"}
        className={cn("flex-initial shrink-0")}
        onBack={isAddingConnection ? onBack : undefined}
      />
      <div className="flex-1 flex flex-col w-full px-6 md:px-10 lg:px-16 xl:px-20 2xl:px-24 max-w-[1250px] mx-auto">
        {/* Scrollable content area */}
        {/* Fixed header section */}
        <Header
          className={cn(
            "flex-initial flex-shrink-0 px-4 pt-4 sm:pt-6 lg:pt-8 2xl:pt-10",
            isAddingConnection && "px-0"
          )}
        />
        {isAddingConnection ? (
          <AddConnection
            onCreateConnection={onCreateConnection}
            className="flex-1 pb-8"
          />
        ) : (
          <div
            className="flex-1 min-h-0 p-2 overflow-hidden mx-auto 2xl:pt-10"
            onMouseDown={onMouseDown}
          >
            <TableConnections
              handleDeleteConnection={handleDeleteConnection}
              handleEditConnection={handleEditConnection}
              handleOnDefault={handleOnDefault}
            />
            {connectionIds.length === 0 && (
              <div className="mt-10 text-muted-foreground/50 font-medium text-center">
                No connections created
              </div>
            )}
          </div>
        )}

        <Navigation className="flex-shrink-0" />
      </div>
      {
        <DetectBoardKey
          boardKey="Escape"
          preventDefault
          stopPropagation
          onKeyPress={handleOnFallBack}
        />
      }
      {connectionIdToDelete && (
        <DeleteDialog
          connectionId={connectionIdToDelete}
          confirmDelete={confirmDelete}
          onOpenChange={() => {
            setConnectionIdToDelete(undefined);
            restoreFocus();
          }}
        />
      )}
      {connectionIdToEdit && (
        <EditDialog
          connectionId={connectionIdToEdit}
          onOpenChange={() => {
            setConnectionIdToEdit(undefined);
            restoreFocus();
          }}
        />
      )}
    </div>
  );
}

const ConnectionDropdown = ({
  connectionId,
  handleOnDelete,
  handleOnRenaming,
  handleOnDefault,
}: {
  connectionId: string;
  handleOnDelete: (connection: string) => void;
  handleOnRenaming: (connection: string) => void;
  handleOnDefault: (connection: string) => void;
}) => {
  const { setFocus, restoreFocus } = useFocusContext();

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open === false) {
        restoreFocus();
      }
    },
    [restoreFocus]
  );

  const handleOnCloseAutoFocus = useCallback(
    (e: Event) => {
      preventDefaultAndStopPropagation(e);
      restoreFocus();
    },
    [restoreFocus, setFocus]
  );

  return (
    <>
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button tabIndex={-1} variant={"ghost"} size={"icon"}>
            <EllipsisIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onCloseAutoFocus={handleOnCloseAutoFocus}>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => handleOnDefault(connectionId)}>
            Make default
            <DropdownMenuShortcut>D</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleOnRenaming(connectionId)}>
            Rename
            <DropdownMenuShortcut>R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleOnDelete(connectionId)}>
            Delete
            <DropdownMenuShortcut>←</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

import React, { KeyboardEventHandler, useCallback } from "react";
import { APIResponse } from "@/services/types";
import { ConnectionOptions } from "pg-connection-string";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import ProviderIcon from "../../icons/providerIcon";
import { Checkbox } from "../../ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useTabContext } from "@/contexts/tab";
import {
  tabConnectionCollapsibleChanged,
  tabConnectionCreationCanceled,
  tabConnectionNameChanged,
  tabConnectionOptionsChanged,
  tabConnectionStringChanged,
  tabConnectionValidationFailed,
  testConnectionString,
} from "@/features/tabs";
import { preventDefaultAndStopPropagation, stopPropagation } from "../../utils";
import BoardKey from "../../utils/shortcuts/boardKey";
import { Button } from "../../ui/button";
import SmallTooltip from "../../utils/SmallTooltip";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import { cn } from "@/lib/utils";
import { useFocusContext } from "@/contexts/focus";
import { AppDispatch } from "@/store";
import { APIError } from "../../../services/error";
import { Connection, connectionAdded } from "@/features/connections";
import { AppConfig } from "../../app";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";

export const ADD_CONNECTION_STRING_INPUT_REF_ID = "add_connection_string";

export const handleOnCreateConnection = async (
  tabId: string,
  connections: Array<Connection>,
  newConnection: Partial<Connection>,
  isDefault: boolean,
  dispatch: AppDispatch,
  toast: (options: { title: string; description: string }) => void,
  saveConfig: (appConfig: Partial<AppConfig>) => Promise<void>
): Promise<Connection | undefined> => {
  const { connectionString } = newConnection;

  if (!connectionString) {
    toast({
      description: "Connection string is required.",
      title: "Connection Error",
    });
    return undefined;
  }

  try {
    const { data: valid, error } = await dispatch(
      testConnectionString({ tabId, connectionString })
    ).unwrap();

    if (valid && connectionString) {
      dispatch(connectionAdded({ connection: newConnection as Connection }));
      dispatch(tabConnectionCreationCanceled({ tabId }));
      if (isDefault) {
        saveConfig({
          connectionList: [...connections, newConnection as Connection],
          defaultConnectionId: newConnection.id,
        });
      } else {
        saveConfig({
          connectionList: [...connections, newConnection as Connection],
        });
      }
      return newConnection as Connection;
    } else if (error) {
      console.error("Error from validation: ", error);
      dispatch(
        tabConnectionValidationFailed({
          tabId,
          error: APIError.normalizeError(
            error,
            "Unknown error validating connection string."
          ).toJSON(),
        })
      );
      toast({
        title: "Connection Error",
        description: APIError.normalizeError(
          error,
          "Connection string is invalid."
        ).message,
      });
    }
  } catch (error) {
    console.error("Catch err recived form validation: ", error);
    dispatch(
      tabConnectionValidationFailed({
        tabId,
        error: APIError.normalizeError(
          error,
          "Unknown error validating connection string."
        ).toJSON(),
      })
    );
  }

  return undefined;
};

const buildConnectionString = (options: ConnectionOptions): string => {
  const { user, password, host, port, database, ssl } = options;

  let connectionString = "postgres://";
  if (user || password) {
    if (user) {
      connectionString += `${encodeURIComponent(user)}`;
      if (password) {
        connectionString += `:${encodeURIComponent(password)}`;
      }
    } else if (password) {
      connectionString += `${encodeURIComponent(password)}`;
    }
    if (host) {
      connectionString += `@${host}`;
    }
  } else {
    if (host) {
      connectionString += `${host}`;
    }
  }
  if (port) {
    connectionString += `:${port}`;
  }

  if (database) {
    connectionString += `/${database}`;
  }

  if (ssl) {
    connectionString += "?sslmode=required";
  }

  return connectionString;
};

const AddConnection = ({
  onCreateConnection,
  className,
  disableCancel,
  onboarding,
}: {
  onCreateConnection: () => void;
  className?: string;
  disableCancel?: boolean;
  onboarding?: boolean;
}) => {
  /**
   * Contexts
   */
  const { id: tabId } = useTabContext();
  const { createRef } = useFocusContext();
  const dispatch = useAppDispatch();
  const [, copy] = useCopyToClipboard();

  /**
   * Selectors
   */
  const loading = useAppSelector(
    (state) => state.tabs.entities[tabId]?.loading
  );
  const connectionOptions = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.newConnection
        ?.connectionOptions
  );
  const connectionString = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.newConnection
        ?.connectionString
  );
  const provider = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.newConnection?.provider
  );
  const name = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.newConnection?.name
  );
  const isOpen = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.isAddingOptionsManually
  );

  /**
   * Callbacks
   */
  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> =
    useCallback((e) => {
      const connectionString = e.target.value;
      dispatch(tabConnectionStringChanged({ tabId, connectionString }));
      const asyncOp = async () => {
        try {
          const {
            data: connectionOptions,
          }: APIResponse<ConnectionOptions, Error> = await (
            window as Window
          ).electronAPI.parseConnectionString(connectionString);
          if (connectionOptions) {
            dispatch(tabConnectionOptionsChanged({ tabId, connectionOptions }));
          }
        } catch (error) {
          console.error("Error processing options: ", error);
        }
      };
      asyncOp();
    }, []);

  const handleManualInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | boolean) => {
      /**
       * Handle SSL separately (it is a Checkbox)
       */
      const isSSL = typeof e === "boolean";
      const fieldName = isSSL ? "ssl" : e.target.name;
      const value = isSSL ? e : e.target.value;

      /**
       * Handle name change separately
       */
      if (fieldName === "name") {
        dispatch(
          tabConnectionNameChanged({
            tabId,
            name: value as string,
          })
        );
        return;
      }

      const newConnectionOptions: ConnectionOptions = connectionOptions
        ? {
            ...connectionOptions,
            [fieldName]: value,
          }
        : {
            host: null,
            database: undefined,
            [fieldName]: value,
          };

      dispatch(
        tabConnectionOptionsChanged({
          tabId,
          connectionOptions: newConnectionOptions,
        })
      );
      dispatch(
        tabConnectionStringChanged({
          tabId,
          connectionString: buildConnectionString(newConnectionOptions),
        })
      );
    },
    [tabId, connectionOptions]
  );

  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      dispatch(tabConnectionCollapsibleChanged({ tabId, open: isOpen }));
    },
    [tabId]
  );

  const onCollapsibleKeydown: KeyboardEventHandler<HTMLButtonElement> =
    useCallback(
      (e) => {
        // We need to prevent default here because otherwise the enter will trigger the form.
        if (e.key === "Enter") {
          preventDefaultAndStopPropagation(e);
          onOpenChange(!isOpen);
        }
        if (e.key === "Tab" && isOpen === false) {
          onOpenChange(true);
        }
      },
      [isOpen]
    );

  const onCancelAddConnectionClick = useCallback(() => {
    if (!onboarding) {
      dispatch(tabConnectionCreationCanceled({ tabId }));
      dispatch(tabConnectionCollapsibleChanged({ tabId, open: false }));
    }
  }, [tabId, onboarding]);

  const onCancelKeyDown: KeyboardEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      if (e.key === "Enter") {
        preventDefaultAndStopPropagation(e);
        onCancelAddConnectionClick();
      }
    },
    [onCancelAddConnectionClick]
  );

  return (
    /**
     * It is necessary to stop propagation over here.
     * If it scalates, the parent component couldn run a prevent default
     * which will disable focus on the inputs and this is not a behavior we want in an input.
     */
    <div
      className={cn("w-full max-h-full max-w-full gap-10 pb-10", className)}
      onMouseDown={stopPropagation}
    >
      {!isOpen && (
        <div
          className={cn(
            "py-6 md:py-8 xl:py-10 flex flex-col xl:flex-row gap-8 xl:gap-20",
            onboarding && "mt-4 md:py-0 xl:py-0 gap-0 xl:gap-0 xl:flex-col"
          )}
        >
          <div className="flex-1xl:ml-0">
            {!onboarding && (
              <h3 className="mt-4 xl:mt-8 text-sm font-semibold">
                Connection string
              </h3>
            )}
            <p className="text-sm text-muted-foreground">
              Use a connection string to connect to your Postgres database
            </p>
          </div>
          <div
            className={cn(
              "relative xl:ml-0 bg-panel shadow shadow-black/20 flex-1 px-6 pb-7 pt-5 rounded-lg border xl:max-w-[612px]",
              onboarding && "bg-panel mt-2"
            )}
          >
            <Label className="ml-1" htmlFor="connection_string">
              Connection string
            </Label>
            <Input
              ref={createRef("connection", "input", {
                id: ADD_CONNECTION_STRING_INPUT_REF_ID,
              })}
              className="mt-1 w-full max-w-full pr-10 truncate"
              autoFocus
              placeholder="postgresql://postgres:postgres@localhost:5432"
              type="text"
              readOnly={loading}
              value={connectionString}
              onChange={handleInputChange}
              name="connection[string]"
              id="connection_string"
              disabled={loading}
            />
            <BoardKey
              className="absolute right-8 top-12 mt-0.5"
              variant={"default"}
              characters={["⏎"]}
            />
          </div>
        </div>
      )}

      {!isOpen && (
        <div className="flex items-center">
          <SmallTooltip
            description={"Create connection"}
            shortcut={["Enter"]}
            asChild
          >
            <Button
              variant={"primary"}
              size={"lg"}
              onClick={onCreateConnection}
              className={cn(
                onboarding ? "w-full" : "w-52 mx-auto",
                "items-center mt-10"
              )}
              disabled={loading}
            >
              Create connection
            </Button>
          </SmallTooltip>
        </div>
      )}
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <div
          className={cn(
            "flex flex-row gap-2 items-center overflow-hidden ml-4 xl:ml-0 mx-auto w-full mt-10",
            onboarding && "ml-0 mt-4",
            !onboarding && isOpen && "hidden"
          )}
        >
          <CollapsibleTrigger
            onKeyDown={onCollapsibleKeydown}
            className="shrink-0"
            asChild
          >
            <Button
              variant={"ghost"}
              size={"lg"}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary focus-visible:text-primary mx-auto"
              hidden={isOpen && onboarding}
            >
              <div className="shrink-0">Manual Connection Setup</div>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2">
          <div
            className={cn(
              "pt-11 flex flex-col xl:flex-row gap-8 xl:gap-20",
              onboarding && "xl:flex-col pt-0 gap-4 xl:gap-4"
            )}
          >
            <div className={cn("flex-1 ml-4 xl:ml-0", onboarding && "ml-0")}>
              <h3
                className={cn(
                  "mt-0 xl:mt-8 text-base",
                  onboarding && "hidden xl:mt-0"
                )}
              >
                Basic information
              </h3>
              <p
                className={cn(
                  "mt-3 text-muted-foreground",
                  onboarding && "mt-0 text-sm mb"
                )}
              >
                Need help with the connection? Let us know at{" "}
                <span
                  tabIndex={-1}
                  className="underline select-text hover:cursor-pointer"
                  onClick={() => copy("help@dataterminal.app", undefined, true)}
                >
                  help@dataterminal.app
                </span>
              </p>
            </div>
            <div
              className={cn(
                "bg-panel ml-4 xl:ml-0 flex-1 px-6 py-9 rounded-lg shadow shadow-black/20 border xl:max-w-[612px]",
                onboarding && "ml-0 py-4"
              )}
            >
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1">
                  <Label className="ml-1" htmlFor="connection_name">
                    Name
                  </Label>
                  <Input
                    className="mt-1"
                    required={true}
                    placeholder="Postgres"
                    type="text"
                    value={name}
                    autoFocus
                    onChange={handleManualInputChange}
                    name="name"
                    id="connection_name"
                    readOnly={loading}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <Label className="ml-1" htmlFor="connection_platform">
                      Platform
                    </Label>
                    <ProviderIcon
                      provider={provider || "Postgres"}
                      className="absolute left-2.5 top-8 bottom-0.5 size-4 z-10"
                    />
                    <Input
                      className="mt-1 pl-10 bg-zinc-800"
                      disabled={true}
                      readOnly={true}
                      value={provider || "Postgres"}
                      name="connection[platform]"
                      id="connection_platform"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex gap-4 flex-wrap">
                <div className="flex-1">
                  <Label className="ml-1" htmlFor="connection_host">
                    Host
                  </Label>
                  <Input
                    className="mt-1"
                    type="text"
                    placeholder="localhost"
                    name="host"
                    id="connection_host"
                    value={connectionOptions?.host ?? ""}
                    onChange={handleManualInputChange}
                    readOnly={loading}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <Label className="ml-1" htmlFor="connection_port">
                    Port
                  </Label>
                  <Input
                    className="mt-1"
                    type={"number"}
                    placeholder={"5432"}
                    name="port"
                    id="connection_port"
                    value={connectionOptions?.port ?? ""}
                    onChange={handleManualInputChange}
                    readOnly={loading}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-4 flex-wrap">
                <div className="flex-1">
                  <Label className="ml-1" htmlFor="connection_user">
                    Username
                  </Label>
                  <Input
                    className="mt-1"
                    type="text"
                    name="user"
                    id="connection_user"
                    value={connectionOptions?.user ?? ""}
                    onChange={handleManualInputChange}
                    readOnly={loading}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <Label className="ml-1" htmlFor="connection_password">
                    Password
                  </Label>
                  <Input
                    className="mt-1"
                    type={"password"}
                    name="password"
                    id="connection_password"
                    value={connectionOptions?.password ?? ""}
                    onChange={handleManualInputChange}
                    readOnly={loading}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="mt-5 flex gap-4 flex-wrap">
                <div className="flex-1">
                  <Label className="ml-1" htmlFor="connection_database">
                    Database
                  </Label>
                  <Input
                    className="mt-1"
                    type="text"
                    name="database"
                    id="connection_database"
                    value={connectionOptions?.database ?? ""}
                    onChange={handleManualInputChange}
                    readOnly={loading}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <Label className="ml-1">Security</Label>
                  <div className="flex items-center space-x-2 pt-3">
                    <Checkbox
                      id="connection_ssl"
                      className="text-muted-foreground border-muted-foreground"
                      checked={!connectionOptions?.ssl ? false : true}
                      name="ssl"
                      onCheckedChange={
                        handleManualInputChange as (e: boolean) => void
                      }
                      disabled={loading}
                    />
                    <Label className="ml-1 " htmlFor="connection_ssl">
                      SSL
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className={cn(
              "flex gap-2 ml-auto mt-10 w-fit",
              onboarding && "w-full"
            )}
          >
            <SmallTooltip
              description={"Cancel connection creation"}
              shortcut={["esc"]}
              asChild
            >
              <Button
                variant={"ghost"}
                onClick={onCancelAddConnectionClick}
                onKeyDown={onCancelKeyDown}
                className="items-center"
                hidden={loading || disableCancel}
                disabled={loading || disableCancel}
              >
                Cancel
              </Button>
            </SmallTooltip>
            <SmallTooltip
              description={"Create connection"}
              shortcut={["⌘", "Enter"]}
              asChild
            >
              <Button
                variant={"primary"}
                onClick={onCreateConnection}
                size={onboarding ? "lg" : "default"}
                className={cn("items-center", onboarding && "w-full")}
                disabled={loading}
              >
                Create connection
              </Button>
            </SmallTooltip>
          </div>
        </CollapsibleContent>
      </Collapsible>
      {!loading && (
        <DetectBoardKey
          stopPropagation
          preventDefault
          boardKey={"Escape"}
          onKeyPress={onCancelAddConnectionClick}
          skipIfExplorerIsFocused
        />
      )}
      {!loading && (
        <DetectBoardKey
          stopPropagation
          preventDefault
          boardKey={"Enter"}
          onKeyPress={onCreateConnection}
          skipIfExplorerIsFocused
        />
      )}
    </div>
  );
};

export default AddConnection;

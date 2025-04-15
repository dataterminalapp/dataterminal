import { useAppDispatch } from "./useRedux";
import {
  setupDatabases,
  databaseLoaded,
  setupConnection,
  connectionConnected,
  checkLatency,
  schemaLoaded as workspaceSchemaLoaded,
  setupSchemas,
  schemaFailed,
  connectionFailed,
} from "@/features/workspace";
import { APIError } from "../services/error";
import { useToast } from "./useToast";
import { useCallback, useMemo, useRef } from "react";
import { Connection } from "@/features/connections";
import { schemaCleaned, schemaLoaded } from "@/features/schema";
import { nanoid } from "@reduxjs/toolkit";
import { searchPathChanged, setupSearchPath } from "@/features/workspace";

const requestIsInvalid = (
  ref: React.MutableRefObject<string | null>,
  id: string
) => ref.current !== id;

/**
 *
 * @param id The id of the panel to get the height of.
 */
export function useConnection() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const setupConnectionRefId = useRef<string | null>(null);
  const setupDatabasesRefId = useRef<string | null>(null);
  const setupSchemasRefId = useRef<string | null>(null);
  const setupSearchPathRefId = useRef<string | null>(null);

  const setupDatabasesAsync = useCallback(async () => {
    const requestId = nanoid();
    setupDatabasesRefId.current = requestId;

    try {
      const { data, error } = await dispatch(setupDatabases()).unwrap();

      if (requestIsInvalid(setupDatabasesRefId, requestId)) return;
      if (error) {
        toast({
          title: "Error setting up connection",
          description: error.message,
        });
      } else if (data) {
        dispatch(
          databaseLoaded({
            database: data.current,
            list: data.list,
          })
        );
      }
    } catch (err) {
      console.error("Error setting up databases: ", err);
      if (requestIsInvalid(setupDatabasesRefId, requestId)) return;

      toast({
        title: "Error setting up connection",
        description: APIError.normalizeError(err, "Unknown error").message,
      });
    }
  }, []);

  const refreshLatency = useCallback(async () => {
    try {
      await dispatch(checkLatency()).unwrap();
    } catch (err) {
      toast({
        title: "Error checking latency",
        description: APIError.normalizeError(err, "Unknown error.").message,
      });
    }
  }, []);

  const setupConnectionAsync = useCallback(
    async (connection: Connection, database?: string) => {
      /**
       * We need to make sure that the request is always the last one.
       * Otherwise we can have a race condition between requests.
       */
      const requestId = nanoid();
      setupConnectionRefId.current = requestId;
      dispatch(schemaCleaned());

      try {
        const { data, error } = await dispatch(
          setupConnection({
            connection,
            database,
          })
        ).unwrap();

        if (requestIsInvalid(setupConnectionRefId, requestId)) return;

        if (error) {
          dispatch(
            connectionFailed({
              error: APIError.normalizeError(error, "Unknown error.").toJSON(),
            })
          );
          toast({
            title: "Error setting up connection",
            description: error.message,
          });
          return;
        } else if (data) {
          dispatch(connectionConnected({ connected: data.connected }));
          if (data.connected) {
            setupDatabasesAsync();
            setupSchemasAsync();
            setupSearchPathAsync();
            refreshLatency();
          }
        }
      } catch (err) {
        if (requestIsInvalid(setupConnectionRefId, requestId)) return;

        dispatch(
          connectionFailed({
            error: APIError.normalizeError(err, "Unknown error.").toJSON(),
          })
        );
        toast({
          title: "Error setting up connection",
          description: APIError.normalizeError(err, "Unknown error.").message,
        });
      }
    },
    [toast, setupDatabasesAsync, refreshLatency]
  );

  const setupSchemasAsync = useCallback(
    async (passive?: boolean, schema?: string) => {
      const requestId = nanoid();
      setupSchemasRefId.current = requestId;

      try {
        if (passive === false) {
          dispatch(schemaCleaned());
        }
        const { data, error } = await dispatch(
          setupSchemas({ schema, passive })
        ).unwrap();

        if (requestIsInvalid(setupSchemasRefId, requestId)) return;
        if (error) {
          dispatch(
            schemaFailed({
              error: APIError.normalizeError(error, "Unknown error.").toJSON(),
            })
          );
          toast({
            title: "Error setting up schema",
            description: error.message,
          });
          return;
        } else if (data) {
          dispatch(
            workspaceSchemaLoaded({
              list: data.list,
              schema: data.current,
              // We don't want to change or set the schema back to the default one
              // after a schema change due to a CREATE/DROP, etc..
              keepSchema: passive,
            })
          );
          dispatch(
            schemaLoaded({
              list: data.list,
            })
          );
        }
      } catch (err) {
        if (requestIsInvalid(setupSchemasRefId, requestId)) return;

        dispatch(
          schemaFailed({
            error: APIError.normalizeError(err, "Unknown error.").toJSON(),
          })
        );
        toast({
          title: "Error setting up connection",
          description: APIError.normalizeError(err, "Unknown error.").message,
        });
      }
    },
    []
  );

  const setupSearchPathAsync = useCallback(async () => {
    const requestId = nanoid();
    setupSearchPathRefId.current = requestId;
    try {
      const { data, error } = await dispatch(setupSearchPath()).unwrap();
      if (requestIsInvalid(setupSearchPathRefId, requestId)) return;
      if (error) {
        toast({
          title: "Error setting up search path.",
          description: error.message,
        });
        return;
      } else if (data) {
        dispatch(
          searchPathChanged({
            searchPath: data,
          })
        );
      }
    } catch (err) {
      if (requestIsInvalid(setupSearchPathRefId, requestId)) return;
      toast({
        title: "Error setting up search path",
        description: APIError.normalizeError(err, "Unknown error.").message,
      });
    }
  }, []);

  return useMemo(() => {
    return {
      setupConnection: setupConnectionAsync,
      setupSchemas: setupSchemasAsync,
      refreshLatency,
      setupSearchPath: setupSearchPathAsync,
    };
  }, [setupConnectionAsync, setupSchemasAsync, refreshLatency]);
}

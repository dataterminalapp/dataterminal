import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "./useRedux";
import {
  historyIndexIncreased,
  inputUpdated,
  queryFinished,
  queryStarted,
  runQuery,
  searchPathChanged,
  setupSearchPath,
} from "@/features/panel";
import { resultAdded } from "@/features/result";
import { resultAdded as panelResultAdded } from "@/features/panel";
import { APIResponse } from "@/services/types";
import { useToast } from "./useToast";
import { capitalizeFirstChar } from "@/components/sections/code/error";
import { transactionUpsert } from "@/features/transactions";
import { APIError, APIErrorJSON, DatabaseError } from "../services/error";
import { ClientResult } from "@/services/local/types";
import { useConnection } from "./useConnection";

export interface UserQueryOptions {
  resultId?: string;
  focusLastResult?: boolean;
  skipInputUpdate?: boolean;
  performance?: boolean;
}

/**
 * Determines if a given SQL command changes the database schema.
 *
 * @param command - The SQL command to evaluate. Can be a string or null.
 * @returns `true` if the command is a schema-changing command (e.g., "CREATE", "DROP", "ALTER"),
 *          otherwise `false`. Returns `false` if the command is null.
 */
const schemaChanged = (command: string | null): boolean => {
  if (!command) return false;
  const schemaCommands = ["CREATE", "DROP", "ALTER"];
  const normalizedCommand = command.trim().toUpperCase();
  return schemaCommands.includes(normalizedCommand);
};

/**
 * Determines if a given SQL command changes a runtime config value.
 *
 * @param command - The SQL command to evaluate. Can be a string or null.
 * @returns `true` if the command is a runtime config command ("SET"),
 *          otherwise `false`. Returns `false` if the command is null.
 */
const runtimeConfigChanged = (command: string | null): boolean => {
  if (!command) return false;
  const schemaCommands = ["SET"];
  const normalizedCommand = command.trim().toUpperCase();
  return schemaCommands.includes(normalizedCommand);
};

/**
 * Custom hook `useQuery` provides functionality to execute SQL queries
 * within a panel context.It handles user-triggered queries (also known as frontend queries), backend queries, and
 * manages state updates and side effects related to query execution.
 *
 * ### Notes:
 * - User queries are executed in a different flow compared to backend queries
 *   to avoid conflicts and ensure proper handling of transactions.
 * - The hook ensures that SQL limits and cursor usage are applied correctly
 *   based on the panel's configuration.
 */
const useQuery = ({ panelId }: { panelId?: string }) => {
  /**
   * Hooks
   */
  const dispatch = useAppDispatch();
  const { setupSchemas: schemaReload } = useConnection();
  const { toast } = useToast();

  /**
   * Selectors
   */
  const transactionId = useAppSelector(
    (state) => panelId && state.panels.entities[panelId]?.transactionId
  );
  const analyzeMode = useAppSelector((state) =>
    panelId ? state.panels.entities[panelId]?.analyzeMode : false
  );
  const limit = useAppSelector((state) =>
    panelId ? state.panels.entities[panelId]?.limit : false
  );
  const useCursor: boolean = useAppSelector((state) => {
    if (
      panelId &&
      state.panels.entities[panelId] &&
      state.panels.entities[panelId].layout === "IDE"
    ) {
      return true;
    }
    return false;
  });

  /**
   * Refs
   */
  const transactionIdRef = useRef<string | null>(null);
  const analyzeModeRef = useRef<boolean>(analyzeMode);
  const limitRef = useRef<boolean>(limit);
  const useCursorRef = useRef<boolean>(useCursor);

  /**
   * Effects
   */
  /**
   * Use a ref to avoid race conditions and unnecesary re-renders.
   */
  useEffect(() => {
    transactionIdRef.current = transactionId ? transactionId : null;
  }, [transactionId]);

  useEffect(() => {
    analyzeModeRef.current = analyzeMode;
  }, [analyzeMode]);

  useEffect(() => {
    limitRef.current = limit;
  }, [limit]);

  useEffect(() => {
    useCursorRef.current = useCursor;
  }, [useCursor]);

  /**
   * Callbacks
   */
  const handlePanelResult = useCallback(
    ({
      data,
      sql,
      panelId,
      analyze,
      error,
    }: {
      data: ClientResult<unknown[]> | undefined;
      sql: string;
      panelId: string;
      analyze?: ClientResult<string[]> | undefined;
      error?: APIErrorJSON;
    }) => {
      if (error) {
        const resultAddedResult = dispatch(
          resultAdded({
            data,
            error,
            sql,
            panelId,
            transactionId: error?.transaction?.id,
            timing: undefined,
          })
        );
        dispatch(
          panelResultAdded({
            panelId,
            resultId: resultAddedResult.payload.id,
          })
        );
      } else {
        const resultAddedResult = dispatch(
          resultAdded({
            data,
            error,
            sql,
            panelId,
            timing: data?.timing,
            transactionId: data?.transaction?.id,
            analyze,
          })
        );

        dispatch(
          panelResultAdded({
            panelId,
            resultId: resultAddedResult.payload.id,
          })
        );
      }
    },
    [panelId]
  );

  const setupSearchPathAsync = useCallback(
    async (panelId: string) => {
      try {
        const { data, error } = await dispatch(
          setupSearchPath({ panelId })
        ).unwrap();
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
              panelId,
            })
          );
        }
      } catch (err) {
        toast({
          title: "Error setting up connection",
          description: APIError.normalizeError(err, "Unknown error.").message,
        });
      }
    },
    [toast]
  );

  /**
   * Use this query to run frontend queries.
   *
   * The user query runs in a different flow compared to the back query.
   * The user query is triggered by the user, and if the the limit is enabled,
   * the backend will apply a limit over the SQL.
   *
   * It is important to notice this difference from many angles:
   * 1. We don't want to run queries on the same context (a panel) the user is running queries,
   *    because we could mess up the process, e.g. if the user is running transactions.
   * 2. Select statements can be limited, and limiting a select statement, introduces a
   *    parsing complexity over a query. This means we need to parse the statement,
   *    introduce the limit, and unparse again. The issue here is that unparsing
   *    will revert details we do not want, for example: unescaping entity names.
   *
   * Returns true if request executes successfully.
   */
  const userQueryCb = useCallback(
    async (sql: string, options?: UserQueryOptions) => {
      if (!panelId) {
        toast({
          description:
            "The panel went missing. Please contact support if the issue persists.",
          title: "Error fetching more results",
        });

        return false;
      }

      if (!options?.skipInputUpdate) {
        dispatch(inputUpdated({ id: panelId, input: sql }));
      }

      // const analyzePromise:
      //   | Promise<APIResponse<ClientResult<Array<string>>, APIErrorJSON>>
      //   | undefined = analyzeModeRef.current
      //   ? (window as Window).electronAPI.query(
      //       `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`
      //     )
      //   : undefined;

      try {
        const { data, error } = await dispatch(
          runQuery({
            panelId,
            sql,
            skipInputUpdate: options?.skipInputUpdate,
            limit: limitRef.current,
          })
        ).unwrap();

        const transaction =
          (data && data.transaction) || (error && error.transaction);
        if (transaction) {
          dispatch(transactionUpsert(transaction));
        }

        /**
         * The issue about running analyze over a query before is that if there is an issue on the query,
         * the debugging the issue will be harder?
         *
         * Well, if the query fails, it is ok. If it fails during a transaction we use savepoints.
         *
         * If it is runned before, we stop the pagination.
         */
        let analyze;
        // if (analyzePromise) {
        //   try {
        //     const { data: analyzeData, error: analyzeError } =
        //       await analyzePromise;

        //     if (analyzeError) {
        //       console.error("Error expplaining query: ", analyzeError);
        //     } else {
        //       analyze = analyzeData;
        //     }
        //   } catch (err) {
        //     console.error("Error found: ", err);
        //   } finally {
        //     dispatch(queryFinished({ id: panelId }));
        //   }
        // }

        handlePanelResult({
          data,
          panelId,
          sql,
          error,
          analyze,
        });

        if (data) {
          const { command } = data;
          if (schemaChanged(command)) {
            schemaReload(true);
          }
          if (runtimeConfigChanged(command)) {
            setupSearchPathAsync(panelId);
          }
        }

        if (!options?.skipInputUpdate) {
          dispatch(inputUpdated({ id: panelId, input: "" }));
        }

        if (options?.focusLastResult && panelId) {
          dispatch(historyIndexIncreased({ id: panelId }));
        }
        return error === undefined;
      } catch (err) {
        const error = APIError.normalizeError(err, "");
        handlePanelResult({
          data: undefined,
          sql,
          panelId,
          error: error.toJSON(),
        });
        if (!options?.skipInputUpdate) {
          dispatch(inputUpdated({ id: panelId, input: "" }));
        }
        if (options?.focusLastResult && panelId) {
          dispatch(historyIndexIncreased({ id: panelId }));
        }
        return false;
      }
    },
    [dispatch, schemaReload, setupSearchPath, runQuery, panelId, toast]
  );

  /**
   * Use this query callback to run almost any query the application needs,
   * and that is not written by the user or a panel action.
   */
  const runBackQueryCb = useCallback(
    async (sql: string, action: string, values?: Array<string>) => {
      try {
        if (panelId) {
          dispatch(queryStarted({ id: panelId }));
        }

        const response: APIResponse<ClientResult, DatabaseError> = await (
          window as Window
        ).electronAPI.query(sql, values, panelId);

        if (response?.data?.command && schemaChanged(response?.data?.command)) {
          schemaReload(true);
        }

        if (response.error) {
          toast({
            title: `Error ${action}`,
            description: capitalizeFirstChar(response.error.message),
          });
        }

        if (panelId) {
          handlePanelResult({
            data: response.data,
            panelId,
            sql,
            error:
              response.error &&
              APIError.normalizeError(
                response.error,
                "Error executing statement"
              ).toJSON(),
          });
        }

        return response;
      } catch (error) {
        console.error("Error running global query: ", error);
        return {
          error: APIError.normalizeError(error, `Error ${action}`),
        };
      } finally {
        if (panelId) {
          dispatch(queryFinished({ id: panelId }));
        }
      }
    },
    [schemaReload, toast, panelId]
  );

  return useMemo(
    () => ({
      userQuery: userQueryCb,
      backQuery: runBackQueryCb,
    }),
    [userQueryCb, runBackQueryCb]
  );
};

export default useQuery;

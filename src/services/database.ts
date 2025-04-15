import { IpcMainInvokeEvent } from "electron";
import { Client } from "./local/client";
import { Client as PgClient, types } from "pg";
import { APIResponse } from "./types";
import { ConnectionOptions, parse } from "pg-connection-string";
import { performance } from "perf_hooks";

import { APIError, APIErrorJSON } from "./error";
import { ClientResult } from "./local/types";

/**
 * Custom override over date/time types for `pg` client.
 * Converts date/time values to strings during parsing.
 */
const parseFn = function (val: unknown) {
  return val === null ? null : String(val);
};

const noDateTypes = [
  "DATE",
  "TIME",
  "TIMESTAMP",
  "TIMESTAMPTZ",
  "INTERVAL",
  "TIMETZ",
];

noDateTypes.forEach((typeName) => {
  const typeId = types.builtins[typeName as keyof typeof types.builtins];
  if (typeId) {
    types.setTypeParser(typeId, parseFn);
  }
});

/**
 * Global client
 */
let client: Client;

/**
 * Sets the current connection string for the global database client.
 * This function initializes a new client with the provided connection string
 * and optionally a specific database. It affects the application globally.
 */
export const setConnectionString = async (
  event: IpcMainInvokeEvent,
  connectionString: string,
  database?: string
): Promise<APIResponse<{ connected: boolean }, APIErrorJSON>> => {
  try {
    if (client) {
      client.end().catch((err) => console.error("Error ending client: ", err));
    }
    client = new Client(connectionString, database);
    const c = await client.pool.connect();
    c.on("error", (err) => {
      console.error("Error on the connect client: ", err);
    });
    c.release();
    return { data: { connected: client.connected } };
  } catch (err) {
    const error = APIError.normalizeError(
      err,
      "An error occurred while connecting to the database"
    ).toJSON();
    return {
      error,
    };
  }
};

/**
 * Parses a PostgreSQL connection string into its components.
 */
export const parseConnectionString = async (
  event: IpcMainInvokeEvent,
  connectionString: string
): Promise<APIResponse<ConnectionOptions, Error>> => {
  try {
    return { data: parse(connectionString) };
  } catch (err) {
    return {
      error: APIError.normalizeError(err, "Error parsing connection string."),
    };
  }
};

/**
 * Tests the validity of a PostgreSQL connection string by attempting to connect to the database.
 */
export const testConnectionString = async (
  event: IpcMainInvokeEvent,
  connectionString: string
): Promise<APIResponse<boolean, APIErrorJSON>> => {
  try {
    const testClient = new PgClient(connectionString);
    await testClient.connect();
    try {
      await testClient.end();
    } catch (err) {
      console.error("Error closing test client: ", err);
    }
    return { data: true };
  } catch (err) {
    const error = APIError.normalizeError(
      err,
      "Error connecting client."
    ).toJSON();
    console.error("Error connecting client: ", error.message);
    return {
      data: false,
      error,
    };
  }
};

export const query = async (
  event: IpcMainInvokeEvent,
  sql: string,
  values?: Array<string>,
  panelId?: string,
  limit?: boolean
): Promise<
  APIResponse<ClientResult<unknown[]> & { count: number | null }, APIErrorJSON>
> => {
  if (!client) {
    return { error: new APIError("Client not initialized.").toJSON() };
  }

  const before = new Date();
  try {
    const result = await client.query(sql, values, panelId, limit);

    return {
      data: {
        rows: result.rows,
        command: result.command,
        count: result.rowCount,
        oid: result.oid,
        fields: result.fields,
        rowCount: result.rowCount,
        notice: result.notice,
        timing: result.timing,
        transaction: result.transaction,
      },
    };
  } catch (error) {
    const normalizedError = APIError.normalizeError(
      error,
      "Error running query.",
      panelId ? client.getTransationState(panelId) : undefined,
      new Date().getTime() - before.getTime()
    ).toJSON();
    return {
      error: normalizedError,
    };
  }
};

/**
 * Cancels an ongoing query associated with a specific panel ID.
 * It is very common for this operation to fail. Databases use pgBouncer,
 * or share the PID between clients, making it difficult.
 * Sometimes, Postgres forks don't even implement this query efficiently.
 * So unexpected behaviors are common scenarios, unfortunately.
 *
 * @param event - The IPC event that triggered this function.
 * @param panelId - The panel ID associated with the query to cancel.
 * @returns A promise resolving to an API response indicating whether the query was successfully canceled.
 */
export const cancelQuery = async (
  event: IpcMainInvokeEvent,
  panelId: string
): Promise<APIResponse<{ canceled: boolean }, APIErrorJSON>> => {
  try {
    await client.cancelBackend(panelId);
    return {
      data: {
        canceled: true,
      },
    };
  } catch (err) {
    return {
      data: {
        canceled: false,
      },
      error: APIError.normalizeError(
        err,
        "Error canceling query.",
        client.getTransationState(panelId)
      ).toJSON(),
    };
  }
};

/**
 * Measures the latency of the database by executing a simple query (`SELECT 1`).
 *
 * @returns A promise resolving to an API response containing the latency in milliseconds or an error.
 */
export const latencyDatabase = async (): Promise<
  APIResponse<{ latency?: number }, APIErrorJSON>
> => {
  const oneUseClient = new PgClient(client.connectionString);

  try {
    await oneUseClient.connect();
    const queryStartTime = performance.now();
    await oneUseClient.query("SELECT 1");
    const queryEndTime = performance.now();
    oneUseClient
      .end()
      .catch((err) => console.error("Error closing one use client: ", err));

    return {
      data: {
        latency: queryEndTime - queryStartTime,
      },
    };
  } catch (err) {
    const error = APIError.normalizeError(
      err,
      "Error getting latency from the database."
    ).toJSON();
    console.error("Error connecting to the database:", error.message);
    oneUseClient
      .end()
      .catch((err) => console.error("Error closing one use client: ", err));
    return {
      data: {},
      error,
    };
  }
};

/**
 * Removes the database client associated with a specific panel ID.
 * This is very important to avoid connection leakage.
 */
export const removePanelClient = async (
  event: IpcMainInvokeEvent,
  panelId: string
): Promise<APIResponse<boolean, APIErrorJSON>> => {
  try {
    return {
      data: await client.removePanelClient(panelId),
    };
  } catch (err) {
    const error = APIError.normalizeError(
      err,
      "Error removing panel's client.",
      client.getTransationState(panelId)
    ).toJSON();
    console.error("Error removing panel client:", error.message);
    return {
      data: false,
      error,
    };
  }
};

/**
 * Closes the global database client gracefully.
 * Waits for up to 2 seconds for the client to close before timing out.
 *
 * @returns A promise that resolves when the client is closed.
 */
export const closeClient = async () => {
  await new Promise((res) => {
    const timeoutId = setTimeout(() => res(false), 2000);
    const asyncClose = async () => {
      await client.end();
      clearTimeout(timeoutId);
      res(true);
    };
    asyncClose();
  });
};

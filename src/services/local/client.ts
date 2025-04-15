import { Pool, PoolClient } from "pg";
import {
  ConnectionOptions,
  parse as parseConnection,
} from "pg-connection-string";
import { APIError } from "../error";
import { nanoid } from "@reduxjs/toolkit";
import { parse } from "pgsql-parser";
import { ClientResult, Transaction, TRANSACTION_STATE } from "./types";
import { NoticeMessage } from "pg-protocol/dist/messages";
import Queue from "./queue";
import { executeMetaCommand, META_COMMAND_ID } from "./metaCommand";
import { buildNoticeError } from "../utils";

export interface PoolClientInfo {
  client: PoolClient;
  pid: number;
  panelId: string;
  transaction?: Transaction;
}

export const UNSUPPORTED_META_COMMAND_MSG = "Meta-command not supported yet";

/**
 * A custom PostgreSQL client that manages connections, transactions, and queries
 * for a PostgreSQL database using the `pg` library. This client provides advanced
 * features such as connection pooling, transaction management, query execution,
 * and support for meta-commands.
 *
 * This client was made specifically for the Data Terminal panels and tried to follow
 * some techniques from the `psql` client.
 */
export class Client {
  /**
   * The connection string used to connect to the PostgreSQL database.
   */
  connectionString: string;

  /**
   * The name of the database to connect to. If not provided, the database
   * specified in the connection string will be used.
   */
  database?: string;

  /**
   * The connection pool used to manage database connections.
   */
  pool: Pool;

  /**
   * A map of panel IDs to their associated client information, including
   * the client instance, process ID, and transaction state.
   */
  panelClient: Map<string, PoolClientInfo>;

  /**
   * A map of panel IDs to promises that resolve to client information.
   * Used to track clients that are in the process of connecting.
   */
  connectingClients: Map<string, Promise<PoolClientInfo>>;

  /**
   * Indicates whether the client is connected to the database.
   */
  connected: boolean;

  /**
   * Stores any error encountered by the client.
   */
  error: Error | undefined;

  /**
   * The parsed connection options derived from the connection string.
   */
  connecitonOptions: ConnectionOptions;

  /**
   * A map of panel IDs to their associated message queues for handling
   * notifications from PostgreSQL LISTEN/NOTIFY.
   */
  queues: Map<string, Queue<string>>;

  /**
   * A promise that resolves to the server version number of the PostgreSQL database.
   */
  serverVersion: Promise<number>;

  /**
   * Creates a new instance of the custom PostgreSQL client.
   *
   * @param connectionString - The connection string for the PostgreSQL database.
   * @param database - Optional. The name of the database to connect to.
   */
  constructor(connectionString: string, database?: string) {
    this.connectionString = connectionString;
    this.database = database;
    this.connected = false;
    const connecitonOptions = parseConnection(connectionString);
    this.connecitonOptions = connecitonOptions;
    this.pool = new Pool({
      keepAlive: true,
      database: (database || connecitonOptions.database) as string | undefined,
      host: connecitonOptions.host || "",
      password: connecitonOptions.password || "",
      user: connecitonOptions.user,
      port: connecitonOptions.port as number | undefined,
      ssl: connecitonOptions.ssl as boolean | undefined,
      application_name: connecitonOptions.application_name,
      options: connecitonOptions.options,
      max: 100,
    });
    this.pool.on("error", (error) => {
      console.error("Error in the Postgres client: ", error.message);
      this.error = error;
    });
    this.pool.on("connect", () => {
      this.connected = true;
    });
    this.serverVersion = this.#setServerVersionNumOnConnect();
    this.panelClient = new Map();
    this.connectingClients = new Map();
    this.queues = new Map();
  }

  async #storeClient(
    panelId: string,
    poolClient: PoolClient
  ): Promise<PoolClientInfo> {
    const pidResult = await poolClient.query({
      text: `SELECT pg_backend_pid()`,
      rowMode: "array",
    });
    const pid = pidResult.rows[0][0];

    const poolClientInfo: PoolClientInfo = { client: poolClient, pid, panelId };
    this.panelClient.set(panelId, poolClientInfo);

    return poolClientInfo;
  }

  #setServerVersionNumOnConnect(): Promise<number> {
    const p: Promise<number> = new Promise((res, rej) => {
      const asyncOp = async () => {
        try {
          const result = await this.pool.query("SHOW server_version_num;");
          const { rows } = result;
          const [row] = rows;
          res(Number(row["server_version_num"]));
        } catch (err) {
          rej(err);
        }
      };
      asyncOp().catch(console.error);
    });

    p.catch(console.error);

    return p;
  }

  /**
   * Retrieves the server version number of the PostgreSQL database.
   *
   * @returns A promise that resolves to the server version number.
   */
  async getServerVersionNum(): Promise<number> {
    return this.serverVersion;
  }

  async #connectClient(panelId: string) {
    try {
      if (this.pool.totalCount >= 99) {
        throw new Error("Maximum number of clients connected reached.");
      }
      this.#cleanTransactionStatus(panelId);
      const poolClient = await this.pool.connect();

      poolClient.on("error", async (err) => {
        console.error("Error in a pool client: ", err);
        console.error("Panel id: ", panelId);
        const clientInfo = this.panelClient.get(panelId);
        if (clientInfo) {
          try {
            await this.removePanelClient(panelId);
          } catch (err) {
            console.error("Error removing panel client", panelId, err);
          }
        } else {
          try {
            console.warn("Client info is missing for panel id: ", panelId);
            await this.removePanelClient(panelId);
          } catch (err) {
            console.error("Error removing panel client: ", panelId, err);
          }
        }
      });
      return await this.#storeClient(panelId, poolClient);
    } catch (err) {
      console.error("Error connecting client: ", err);
      throw err;
    }
  }

  async #getClientInfo(panelId: string): Promise<PoolClientInfo> {
    const panelClientData = this.panelClient.get(panelId);

    if (!panelClientData) {
      const connectingClient = this.connectingClients.get(panelId);
      if (!connectingClient) {
        const promise = this.#connectClient(panelId);
        promise
          .catch((err) =>
            console.error(
              "Error in promise: ",
              APIError.normalizeError(err, "Error getting client.")
            )
          )
          .finally(() => this.connectingClients.delete(panelId));
        this.connectingClients.set(panelId, promise);

        return await promise;
      } else {
        return await connectingClient;
      }
    } else {
      return panelClientData;
    }
  }

  isMetaCommand(sql: string) {
    return sql.startsWith("\\");
  }

  /**
   * Executes a SQL query or meta-command on the database.
   *
   * @param sql - The SQL query or meta-command to execute.
   * @param values - Optional. An array of values to parameterize the query.
   * @param panelId - Optional. The panel ID associated with the query.
   * @param limit - Optional. Whether to apply a LIMIT clause to the query.
   * @param metaCommandTest - Optional. Whether to test for meta-commands.
   * @returns A promise that resolves to the query result.
   */
  async query(
    sql: string,
    values?: Array<string>,
    panelId?: string,
    limit?: boolean,
    metaCommandTest?: boolean
  ): Promise<ClientResult<unknown[]>> {
    if (this.isMetaCommand(sql) || metaCommandTest) {
      const noticeError: ClientResult = buildNoticeError(
        META_COMMAND_ID,
        UNSUPPORTED_META_COMMAND_MSG
      );

      if (panelId) {
        const clientInfo = await this.#getClientInfo(panelId);

        try {
          this.#checkAndCleanTransactionStatusIfEnded(clientInfo);

          const before = new Date();
          const metaCommandResponse = await executeMetaCommand(
            clientInfo.client,
            sql,
            this.connecitonOptions.database || "postgres",
            await this.getServerVersionNum()
          );

          const { results } = metaCommandResponse;
          return {
            ...results,
            timing: new Date().getTime() - before.getTime(),
          };
        } catch (err) {
          this.#handleTransactionErrQuery(clientInfo);
          if (
            // eslint-disable-next-line no-constant-condition
            APIError.normalizeError(err, "Unknown error.").message ===
            UNSUPPORTED_META_COMMAND_MSG
          ) {
            return noticeError;
          } else {
            throw err;
          }
        }
      }

      return noticeError;
    } else {
      const query = {
        text: panelId && limit ? this.addLimitToSelect(sql) : sql,
        // Use array mode for correct handling of column names.
        rowMode: "array",
      };

      let notice: NoticeMessage | undefined;
      const clientNoticeListener = (msg: NoticeMessage) => {
        notice = msg;
      };

      if (panelId) {
        const clientInfo = await this.#getClientInfo(panelId);
        this.#checkAndCleanTransactionStatusIfEnded(clientInfo);
        const { client } = clientInfo;
        client.on("notice", clientNoticeListener);
        try {
          const before = new Date();
          const result = await client.query(query, values);
          const { command } = result;

          const transaction = this.#handleTransaction(clientInfo, command, sql);
          client.removeListener("notice", clientNoticeListener);

          return {
            ...result,
            notice,
            timing: new Date().getTime() - before.getTime(),
            transaction,
          };
        } catch (err) {
          this.#handleTransactionErrQuery(clientInfo);
          client.removeListener("notice", clientNoticeListener);
          throw err;
        }
      } else {
        // We don't care much about notices (yet) for global queries, e.g. schema fetching, current database, etc.
        const before = new Date();
        return {
          ...(await this.pool.query(query, values)),
          timing: new Date().getTime() - before.getTime(),
        };
      }
    }
  }

  /**
   * Removes a panel client from the connection pool and cleans up associated resources.
   *
   * @param panelId - The panel ID of the client to remove.
   * @returns A promise that resolves to `true` if the client was successfully removed, or `false` otherwise.
   */
  async removePanelClient(panelId: string): Promise<boolean> {
    try {
      const clientData = this.panelClient.get(panelId);
      if (clientData) {
        const { client } = clientData;
        if (this.queues.has(panelId)) {
          await this.#clearListener(client, panelId);
        }
        /**
         * We want to remove client from the pool.
         * If the user was using custom settings, like SET search_path,. etc.
         * Can cause trouble or confusion. The same happens if the user was running a transaciton.
         * The transaction will remain open until the user needs or the client session ends.
         *
         * By removing the client from the pool, we can make sure that it will not be reused.
         */
        await client.release(true);
        this.panelClient.delete(panelId);
      }

      return true;
    } catch (err) {
      console.error("Error closing panel client: ", err);
      return false;
    }
  }

  /**
   * Cancel backend doesn't work on providers like Neon or Supabase.
   * They share the same PID for the pool, so when you are canceling a backend,
   * it is canceling the `SELECT pg_cancel_backed($1)` query itself.
   * Runs succesfully but the target query will keep running.
   *
   * @param panelId
   * @returns
   */
  async cancelBackend(panelId: string): Promise<boolean> {
    let poolClientInfo;
    try {
      poolClientInfo = await this.#getClientInfo(panelId);
      const { pid } = poolClientInfo;

      if (!pid) {
        throw new Error(`Invalid PID for panel ${panelId}`);
      }

      const { rows } = await this.pool.query(`SELECT pg_cancel_backend($1)`, [
        Number(pid),
      ]);
      const [canceled] = rows;

      return Boolean(canceled);
    } catch (err) {
      console.error("Error in cancelBackend:", err);
      throw err;
    }
  }

  /**
   * Closes all connections in the pool and releases resources.
   */
  async end() {
    this.panelClient.forEach(({ client }) => client.release());
    await this.pool.end();
  }

  /**
   * Adds a LIMIT clause to a query.
   *
   * I've thought about this method a lot, so let me analyze how I arrived at this point:
   *
   * Initially, I used nothing. Then I introduced cursors, which are great because they respect the user's logic
   * and prevent the client from being overwhelmed. However, cursors can overload the database anyway.
   * Additionally, they introduce an extra round trip, which can add 200+ ms per request, making the client feel laggy.
   * Another drawback is that Postgres can send unexpected messages, which can cause the cursor to fail.
   *
   * After exploring alternatives, I tried directly adding a LIMIT by parsing the query. This works well for most queries,
   * but there are edge cases where the parser cannot handle the query correctly. For example, queries like
   * `SELECT continuous_query()` for TimescaleDB can result in unexpected behavior. In such cases, we ask the user
   * if they want to proceed without introducing a limit to the query.
   *
   * Adding a LIMIT has a positive side effect: certain operations benefit from improved performance
   * because the database can push down filters to retrieve data faster. However, we need to inform the user
   * that this is happening behind the scenes, as it may lead to unexpected results in some cases.
   *
   * Another issue with the parser is that it removes quotes from entities that require them,
   * such as table names with uppercase letters (`EVENTS`) or mixed casing (`StRanGe_TableName`).
   * To address this, we use another technique to reduce the blast radius, or let's say, less error-prone.
   *
   * We detect where the query ends and we add the limit over there, but there are the following details to take into consideration,
   * the following items are the only ones that can come after a LIMIT and before the ending of a query, so a LIMIT should never be after them:
   *
   * 1. WITH TIES
   * 2. FETCH FIRST (equals to LIMIT )
   * 3. FOR UPDATE
   * 4. FOR SHARE
   *
   * @param sqlQuery The SQL query to modify.
   * @param limit The LIMIT value to add to the query. Defaults to 100.
   * @returns The modified SQL query with the LIMIT clause applied.
   */
  addLimitToSelect(sqlQuery: string, limit: number = 100): string {
    try {
      // Parse the SQL query into an AST
      const parsedQuery = parse(sqlQuery);

      // Early return if not a valid SELECT statement or already has a LIMIT
      const selectStmt = parsedQuery[0]?.RawStmt?.stmt?.SelectStmt;
      if (!selectStmt || selectStmt.limitCount) {
        return sqlQuery;
      }

      // Don't modify queries with locking clauses
      if (selectStmt.lockingClause) {
        console.warn(
          "Query contains a locking clause - LIMIT will not be added"
        );
        return sqlQuery;
      }

      // Function to find the last meaningful position in the query
      const findLastMeaningfulPosition = (query: string): number => {
        const trimmed = query.trimEnd();
        return trimmed.endsWith(";") ? trimmed.length - 1 : trimmed.length;
      };

      // Function to clean up whitespace and semicolons
      const normalizeQueryEnding = (query: string): string => {
        let normalized = query.trimEnd();
        if (normalized.endsWith(";")) {
          normalized = normalized.slice(0, -1).trimEnd();
        }
        return normalized;
      };

      // Add LIMIT to the query
      const lastPosition = findLastMeaningfulPosition(sqlQuery);
      const baseQuery = normalizeQueryEnding(
        sqlQuery.substring(0, lastPosition)
      );
      const limitClause = ` LIMIT ${limit}`;
      const semicolon = sqlQuery.trimEnd().endsWith(";") ? ";" : "";

      return `${baseQuery}${limitClause}${semicolon}`;
    } catch (error) {
      console.error("Error processing SQL query:", error);
      return sqlQuery;
    }
  }

  /**
   * Retrieves the transaction state for a specific panel ID.
   *
   * @param panelId - The panel ID of the client.
   * @returns The transaction state, or `undefined` if no transaction is active.
   */
  getTransationState(panelId: string): Transaction | undefined {
    return this.panelClient.get(panelId)?.transaction;
  }

  /**
   * Subscribes to PostgreSQL notifications for a specific panel ID.
   *
   * @param panelId - The panel ID to listen for notifications.
   * @returns A promise that resolves when the listener is successfully set up.
   */
  async listen(panelId: string): Promise<void> {
    try {
      const { client } = await this.#getClientInfo(panelId);
      const channelName = panelId;

      // Listen to the specified channel
      await client.query(`LISTEN ${channelName}`);
      const queue = new Queue<string>();
      this.queues.set(panelId, queue);

      // Set up the notification handler
      client.on("notification", (notification) => {
        const payload = notification.payload;
        if (payload) {
          queue.enqueue(payload);
        }
      });
    } catch (error) {
      console.error("Error connecting to PostgreSQL:", error);
      throw error;
    }
  }

  /**
   * Retrieves all messages from the notification queue for a specific panel ID.
   *
   * @param panelId - The panel ID of the client.
   * @returns An array of notification messages.
   */
  async getListenerMessages(panelId: string): Promise<string[]> {
    if (this.panelClient.has(panelId)) {
      const queue = this.queues.get(panelId);
      if (queue) {
        return queue.dequeueAll();
      }
    }

    return [];
  }

  async #clearListener(client: PoolClient, panelId: string): Promise<void> {
    try {
      const channelName = panelId;

      await client.query(`UNLISTEN ${channelName}`);
      this.queues.delete(panelId);
    } catch (error) {
      console.error("Error disconnecting from PostgreSQL:", error);
      throw error;
    }
  }

  #isTransactionStartedCommand(command: string | null) {
    if (!command) return false;
    const normalizedCommand = command.trim().toUpperCase();
    const startCommands = ["BEGIN", "START TRANSACTION"];
    return startCommands.includes(normalizedCommand);
  }

  #isTransactionEndedCommand(command: string | null, sql: string) {
    if (!command) return false;
    const endCommands = [
      "COMMIT",
      "COMMIT PREPARED",
      "ROLLBACK",
      "ROLLBACK PREPARED",
      "END",
    ];

    const normalizedCommand = command.trim().toUpperCase();
    const normalizedSql = sql.trim().toUpperCase();

    // Check for exact matches of end commands
    if (endCommands.includes(normalizedCommand)) {
      /**
       * Special case for ROLLBACK.
       *
       * Make sure that if it is a ROLLBACK, it is not a ROLLBACK TO SAVEPOINT/ROLLBACK TO.
       * ROLLBACK and ROLLBACK TO SAVEPOINT have the same `command` value,
       * but ROLLBACK ends the transaction, but ROLLBACK TO SAVEPOINT/ROLLBACK TO
       * continues the transaction and restores it to a safe point.
       */
      if (normalizedCommand === "ROLLBACK") {
        return (
          !normalizedSql.startsWith("ROLLBACK TO SAVEPOINT") &&
          !normalizedSql.startsWith("ROLLBACK TO")
        );
      }
      return true;
    }

    return false;
  }

  #isTransactionRollbackCommand(command: string | null, sql: string) {
    if (!command) return false;
    const intermediateCommands = ["ROLLBACK TO SAVEPOINT", "ROLLBACK TO"];

    const normalizedCommand = command.trim().toUpperCase();
    const normalizedSql = sql.trim().toUpperCase();

    return (
      intermediateCommands.includes(normalizedCommand) ||
      (command === "ROLLBACK" &&
        /ROLLBACK TO SAVEPOINT/i.test(normalizedSql)) ||
      (command === "ROLLBACK" && /ROLLBACK TO/i.test(normalizedSql))
    );
  }

  #isTransactionInEndedStatus(transaction: Transaction) {
    if (
      transaction.state === TRANSACTION_STATE.ENDED_ERROR ||
      transaction.state === TRANSACTION_STATE.ENDED_SUCCESSFUL
    ) {
      return true;
    } else {
      return false;
    }
  }

  #cleanTransactionStatus(panelId: string) {
    const clientInfo = this.panelClient.get(panelId);
    if (clientInfo) {
      clientInfo.transaction = undefined;
    }
  }

  #checkAndCleanTransactionStatusIfEnded(clientInfo: PoolClientInfo) {
    // Any query after an ended transaction will be a normal transaction.
    // So we clear the transaction from the client info.
    if (
      clientInfo.transaction &&
      this.#isTransactionInEndedStatus(clientInfo.transaction)
    ) {
      clientInfo.transaction = undefined;
    }
  }

  #handleTransactionErrQuery(clientInfo: PoolClientInfo) {
    const { transaction } = clientInfo;
    if (transaction) {
      transaction.state = TRANSACTION_STATE.ERROR;
    }
  }

  #handleTransaction(
    clientInfo: PoolClientInfo,
    command: string | null,
    sql: string
  ): Transaction | undefined {
    // Probably the error is here, handle this with immutability.

    /**
     * Handle if transactions started.
     * Handle transaction ending later, otherwise the result receives no transaction id.
     */
    if (this.#isTransactionStartedCommand(command)) {
      clientInfo.transaction = {
        id: nanoid(),
        state: TRANSACTION_STATE.RUNNING,
      };

      return clientInfo.transaction;
    } else if (this.#isTransactionRollbackCommand(command, sql)) {
      const { transaction } = clientInfo;
      if (transaction) {
        transaction.state = TRANSACTION_STATE.RUNNING;
      } else {
        console.warn(
          "Invalid state detected during isTransactionRollbackCommand."
        );
      }

      return clientInfo.transaction;
    } else if (this.#isTransactionEndedCommand(command, sql)) {
      const { transaction } = clientInfo;
      if (transaction) {
        if (transaction.state === TRANSACTION_STATE.ERROR) {
          transaction.state = TRANSACTION_STATE.ENDED_ERROR;
        } else {
          transaction.state = TRANSACTION_STATE.ENDED_SUCCESSFUL;
        }
      } else {
        console.warn(
          "Invalid state detected during isTransactionEndedCommand."
        );
      }

      return clientInfo.transaction;
    }

    return clientInfo.transaction;
  }
}

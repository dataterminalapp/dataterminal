import { DatabaseError as ProtocolDatabaseError } from "pg-protocol";
import { Transaction } from "./local/types";

/**
 * NoticeOrError and DatabaseError are a copy and paste from the @pg libs types.
 * The idea about copying and pasting here is to be able to use the APIErrorJSON class from the front-end.
 * Using DatabaseError from the front-end from @pg will throw an exception to load libs not available in the browser.
 */
interface NoticeOrError {
  message: string | undefined;
  severity: string | undefined;
  code: string | undefined;
  detail: string | undefined;
  hint: string | undefined;
  position: string | undefined;
  internalPosition: string | undefined;
  internalQuery: string | undefined;
  where: string | undefined;
  schema: string | undefined;
  table: string | undefined;
  column: string | undefined;
  dataType: string | undefined;
  constraint: string | undefined;
  file: string | undefined;
  line: string | undefined;
  routine: string | undefined;
}

export class DatabaseError extends Error implements NoticeOrError {
  readonly length: number;
  readonly name: MessageName;
  severity: string | undefined;
  code: string | undefined;
  detail: string | undefined;
  hint: string | undefined;
  position: string | undefined;
  internalPosition: string | undefined;
  internalQuery: string | undefined;
  where: string | undefined;
  schema: string | undefined;
  table: string | undefined;
  column: string | undefined;
  dataType: string | undefined;
  constraint: string | undefined;
  file: string | undefined;
  line: string | undefined;
  routine: string | undefined;
  constructor(message: string, length: number, name: MessageName) {
    super(message);
    this.length = length;
    this.name = name;
  }
}

export declare type MessageName =
  | "parseComplete"
  | "bindComplete"
  | "closeComplete"
  | "noData"
  | "portalSuspended"
  | "replicationStart"
  | "emptyQuery"
  | "copyDone"
  | "copyData"
  | "rowDescription"
  | "parameterDescription"
  | "parameterStatus"
  | "backendKeyData"
  | "notification"
  | "readyForQuery"
  | "commandComplete"
  | "dataRow"
  | "copyInResponse"
  | "copyOutResponse"
  | "authenticationOk"
  | "authenticationMD5Password"
  | "authenticationCleartextPassword"
  | "authenticationSASL"
  | "authenticationSASLContinue"
  | "authenticationSASLFinal"
  | "error"
  | "notice";

/**
 * Database Error by itself is not parseable to transport from the back-end to the front-end using the bridge.
 * This is an intermediary type.
 */
export type APIDatabaseError = Pick<
  DatabaseError,
  | "severity"
  | "code"
  | "detail"
  | "message"
  | "hint"
  | "position"
  | "internalPosition"
  | "internalQuery"
  | "where"
  | "schema"
  | "table"
  | "column"
  | "dataType"
  | "constraint"
  | "file"
  | "line"
  | "routine"
  | "name"
  | "length"
  // Injected but not delcared props.
> & { port?: string; hostname?: string };

export interface APIErrorJSON {
  message: string;
  name: string;
  databaseError?: ProtocolDatabaseError | DatabaseError;
  transaction?: Transaction;
  timing?: number;
  // This field is added only to distinguish between `APIErrorJSON` and `APIError`. Otherwise, typescript will detect the same fields.
  _type: string;
}

/**
 * Represents a unified error class to handle various types of errors across the application.
 *
 * The `APIError` class is designed to standardize error handling by encapsulating different error types
 * (e.g., database errors, protocol errors, or generic errors) into a single structure. This ensures
 * consistency when dealing with errors in both the back-end and front-end, simplifying debugging and
 * error reporting.
 *
 * Key Features:
 * - Supports errors from multiple sources, including `DatabaseError`, `ProtocolDatabaseError`, and generic `Error`.
 * - Provides a mechanism to normalize errors into a consistent format using the `normalizeError` static method.
 * - Includes additional metadata such as `transaction` and `timing` for enhanced error context.
 * - Converts itself to a JSON-compatible format via the `toJSON` method for seamless transport between back-end and front-end.
 * - Handles specific error codes (e.g., `ECONNREFUSED`, `ENOTFOUND`) to provide more descriptive error messages.
 *
 */
export class APIError extends Error {
  databaseError?: APIDatabaseError;
  transaction?: Transaction;
  timing?: number;

  constructor(
    message?: string,
    databaseError?: DatabaseError | ProtocolDatabaseError,
    transaction?: Transaction,
    timing?: number
  ) {
    super(message || "An error occurred");
    this.name = "APIError"; // Set the name property to match the class name
    this.databaseError =
      databaseError && this.#handleDatabaseError(databaseError);
    this.transaction = transaction;
    this.timing = timing;

    Object.setPrototypeOf(this, APIError.prototype);
  }

  static normalizeError(
    error: unknown,
    defaultMessage: string,
    transaction?: Transaction,
    timing?: number
  ): APIError {
    if (!error) {
      return new APIError("Unknown error.", undefined, transaction, timing);
    }

    // This line doesn't work. I couldn't figure out why.
    // AggregateError is returned for example when a host is not visible in a specific port, at least in macOS happens that.
    // Issue ref: https://github.com/brianc/node-postgres/issues/3312
    // `if (error instanceof AggregateError) { ... }`
    // The second element of the array is selected because it is the option returning the IPv4 error. The first one returns IPv6.
    if (
      Object.getPrototypeOf(error).constructor.name === "AggregateError" ||
      Object.getPrototypeOf(error).constructor === AggregateError
    ) {
      const aggError = error as AggregateError;
      const basicError = aggError.errors[1] || aggError.errors[0];
      return new APIError(
        this.#messageByErrorCode(basicError) || defaultMessage,
        basicError,
        transaction,
        timing
      );
    }

    if (
      error &&
      (error instanceof DatabaseError ||
        error instanceof ProtocolDatabaseError ||
        Object.getPrototypeOf(error).constructor === ProtocolDatabaseError ||
        Object.getPrototypeOf(error).constructor === DatabaseError)
    ) {
      return new APIError(
        this.#messageByErrorCode(
          error as ProtocolDatabaseError | DatabaseError
        ) || defaultMessage,
        error as ProtocolDatabaseError | DatabaseError,
        transaction,
        timing
      );
    } else if (
      error instanceof APIError ||
      Object.getPrototypeOf(error).constructor === APIError
    ) {
      return error as APIError;
    } else if (error && (error as APIErrorJSON)._type === "JSON") {
      const errorJSON = error as APIErrorJSON;
      return new APIError(
        errorJSON.message,
        errorJSON.databaseError,
        errorJSON.transaction,
        errorJSON.timing
      );
    }

    if (typeof error === "string") {
      return new APIError(error, undefined, transaction);
    }

    if (
      Object.getPrototypeOf(error).constructor.name === "Error" ||
      Object.getPrototypeOf(error).constructor === Error ||
      error instanceof Error
    ) {
      return new APIError(
        this.#messageByErrorCode(error as Error),
        {
          message: (error as Error).message,
          // The pg client injects code into some Errors.
          code: (error as { code: string }).code,
          length: 0,
          name: "error",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        transaction,
        timing
      );
    }

    if (typeof error === "object") {
      if (
        error &&
        typeof (error as { toString?: () => string }).toString === "function"
      ) {
        const stringified = (error as { toString: () => string }).toString();
        return new APIError(
          stringified !== "[object Object]" ? stringified : defaultMessage,
          undefined,
          transaction,
          timing
        );
      }

      if (
        error &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
      ) {
        return new APIError(
          (error as { message: string }).message,
          undefined,
          transaction,
          timing
        );
      }
    }

    return new APIError(defaultMessage, undefined, transaction, timing);
  }

  /**
   * Handle Error and possible injected codes from Database Error
   * @param error
   * @returns
   */
  static #messageByErrorCode(
    error: Error & { code?: string; port?: string; hostname?: string }
  ) {
    switch (error.code) {
      case "ECONNREFUSED":
        return `Database connection failed${
          error.port ? ` on port ${error.port}` : ""
        }. Verify connection settings and database status.`;
      case "ENOTFOUND":
        return `Unable to resolve database host${
          error.hostname ? ` (${error.hostname})` : ""
        }. Check connection and network settings.`;
      case "EACCES":
        return "Insufficient database access permissions. Verify credentials.";
      case "ETIMEDOUT":
        return "Database connection timed out. Check connection settings and database availability.";
      default:
        return error.message;
    }
  }

  #handleDatabaseError(
    error: DatabaseError & { hostname?: string; port?: string }
  ): APIDatabaseError {
    // We have to recreate the object. Otherwise the application creates it.
    const {
      severity,
      code,
      detail,
      message,
      hint,
      position,
      internalPosition,
      internalQuery,
      where,
      schema,
      table,
      column,
      dataType,
      constraint,
      file,
      line,
      routine,
      name,
      length,
      hostname,
      port,
    } = error;

    return {
      severity: severity || "ERROR",
      code,
      detail: detail,
      message,
      name,
      length,
      hint,
      position,
      internalPosition,
      internalQuery,
      where,
      schema,
      table,
      column,
      dataType,
      constraint,
      file,
      line,
      routine,
      hostname,
      port,
    };
  }

  // This method is to convert this class into a JSON,
  // because otherwise the deserializer from electron will send only the message from the class
  // to the front-end.
  toJSON(): APIErrorJSON {
    const errorDetails = {
      message: this.message,
      name: this.name,
      databaseError: this.databaseError,
      transaction: this.transaction,
      timing: this.timing,
      _type: "JSON",
    };

    return errorDetails;
  }

  static fromString(serialized: string): APIError {
    const parsed = JSON.parse(serialized);
    const error = new APIError(
      parsed.message,
      undefined,
      parsed.transaction ? JSON.parse(parsed.transaction) : undefined
    );

    if (parsed.databaseError) {
      error.databaseError = JSON.parse(parsed.databaseError);
    }

    return error;
  }
}

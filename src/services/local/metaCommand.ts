import { FieldDef, PoolClient, QueryArrayResult } from "pg";
import { UNSUPPORTED_META_COMMAND_MSG } from "./client";
import { ClientResult } from "./types";
import { describe } from "psql-describe";
import { buildNoticeError } from "../utils";
import { app } from "electron";

export const META_COMMAND_ID = "META_COMMAND";

/**
 * Converts tabular data to a PostgreSQL QueryArrayResult
 *
 * @param tableData The tabular data to convert
 * @returns A PostgreSQL QueryArrayResult
 */
function convertToQueryArrayResult(
  tableData:
    | string
    | { nrows: number; headers: Array<string>; cells: Array<unknown> }
): QueryArrayResult {
  if (typeof tableData === "string") {
    if (tableData.startsWith("ERROR: ")) {
      throw new Error(tableData.substring(7));
    } else {
      const noticeError: ClientResult = buildNoticeError(
        META_COMMAND_ID,
        tableData
      );
      return noticeError;
    }
  }

  const { nrows, headers, cells } = tableData;

  // Create the field definitions
  const fields: FieldDef[] = headers.map((name: string, index: number) => {
    return {
      name,
      tableID: 0,
      columnID: index,
      dataTypeID: 0,
      dataTypeSize: -1,
      dataTypeModifier: -1,
      format: "text",
    };
  });

  // Create rows from cells
  const rows: unknown[][] = [];
  const numColumns = headers.length;

  for (let i = 0; i < nrows; i++) {
    const row: unknown[] = [];
    for (let j = 0; j < numColumns; j++) {
      row.push(cells[i * numColumns + j]);
    }
    rows.push(row);
  }

  // Create the result object
  const result: QueryArrayResult = {
    command: "SELECT",
    rowCount: nrows,
    oid: 0,
    fields,
    rows,
  };

  return result;
}

export interface MetaCommandResponse<T extends unknown[]> {
  description: string;
  results: ClientResult<T>;
}

interface MetaCommandResult {
  command: string;
  verbose: boolean;
  flags?: string[];
  pattern?: string;
  args?: string[];
}

export async function executeMetaCommand(
  client: PoolClient,
  input: string,
  database: string,
  serverVersion: number
): Promise<MetaCommandResponse<unknown[]>> {
  const { command } = parseMetaCommand(input);

  switch (command) {
    case "q":
    case "quit": {
      app.quit();
      break;
    }
    default: {
      return new Promise((res, rej) => {
        const asyncOp = async () => {
          try {
            const { promise, cancel } = describe(
              input,
              database,
              async (sql) => {
                try {
                  return await client.query({ text: sql, rowMode: "array" });
                } catch (err) {
                  rej(err);
                  cancel();
                }
              },
              (items) =>
                res({
                  description: "...",
                  results: {
                    ...convertToQueryArrayResult(items as never),
                    timing: 0,
                  },
                }),
              undefined,
              serverVersion
            );
            await promise;
          } catch (err) {
            rej(err);
          }
        };
        asyncOp();
      });
    }
  }

  throw new Error(UNSUPPORTED_META_COMMAND_MSG);
}

export function isMetaCommand(input: string): boolean {
  return input.startsWith("\\");
}

/**
 * Parses a meta command and its options including command flags and multiple argument patterns
 * @param input The raw command string starting with backslash
 * @returns Parsed command details
 */
export function parseMetaCommand(input: string): MetaCommandResult {
  // Remove initial backslash
  input = input.slice(1);

  // Split into words, preserving quoted strings
  const words = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  // Get the first word which contains command and potential flags
  let commandWithFlags = words[0] || "";

  // Check for verbose flag at the end
  const verbose = commandWithFlags.endsWith("+");
  if (verbose) {
    commandWithFlags = commandWithFlags.slice(0, -1);
  }

  // For commands like 'df', any additional characters are flags
  const baseCommands = new Map([
    ["df", 2], // 'df' is 2 characters
    // Add other commands with their lengths here
  ]);

  let command = commandWithFlags;
  let flags: string[] | undefined;

  // Check if this command potentially has flags
  for (const [baseCmd, length] of baseCommands) {
    if (commandWithFlags.startsWith(baseCmd)) {
      command = baseCmd;
      const flagsPart = commandWithFlags.slice(length);
      if (flagsPart.length > 0) {
        flags = flagsPart.split("");
      }
      break;
    }
  }

  // Initialize result
  const result: MetaCommandResult = {
    command,
    verbose,
  };

  if (flags && flags.length > 0) {
    result.flags = flags;
  }

  // Handle remaining arguments
  const remainingWords = words.slice(1);
  if (remainingWords.length > 0) {
    // Process each argument, removing quotes if present
    const processedArgs = remainingWords.map((arg) =>
      arg.replace(/^"(.*)"$/, "$1")
    );

    // First argument is always the pattern if present
    result.pattern = processedArgs[0];

    // Any subsequent arguments are arg_patterns
    if (processedArgs.length > 1) {
      result.args = processedArgs.slice(1);
    }
  }

  return result;
}

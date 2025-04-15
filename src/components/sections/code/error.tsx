import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { NoticeMessage } from "pg-protocol/dist/messages";
import SmallTooltip from "../../utils/SmallTooltip";
import { useMemo } from "react";
import { useResultContext } from "@/contexts/result";
import { preventDefault, stopPropagation } from "../../utils";
import { DatabaseError } from "../../../services/error";

type ImportantMessage = DatabaseError | NoticeMessage;

interface Props {
  className?: string;
  message: ImportantMessage;
}

// Types for better code organization
type Position = {
  start: number;
  end: number;
};

/**
 * Finds the bounds of a SQL identifier token, including schema and database qualifiers
 * Handles patterns like:
 * - simple_column
 * - schema.column
 * - database.schema.column
 * - "database"."schema"."column"
 *
 * @param query - The SQL query string
 * @param errorPosition - The position where the error was detected
 * @returns Object with start and end positions of the complete identifier
 */
export const findTokenBounds = (
  query: string,
  errorPosition: number
): Position => {
  // Helper to check if a character is valid in SQL identifiers
  const isValidIdentifierChar = (char: string): boolean =>
    /[a-zA-Z0-9_]/.test(char) || char === '"' || char === ".";

  // Helper to check if we're inside a quoted identifier
  const isInsideQuotes = (pos: number): boolean => {
    let quoteCount = 0;
    for (let i = Math.max(0, pos); i >= 0; i--) {
      if (query[i] === '"') quoteCount++;
    }
    return quoteCount % 2 === 1;
  };

  let start = errorPosition - 1;
  let end = errorPosition - 1;

  // Find the start of the complete identifier
  while (start > 0) {
    const prevChar = query[start - 1];
    const isQuoted = isInsideQuotes(start - 1);

    if (!isValidIdentifierChar(prevChar) && !isQuoted) {
      break;
    }
    start--;
  }

  // Find the end of the complete identifier
  while (end < query.length) {
    const currentChar = query[end];
    const isQuoted = isInsideQuotes(end);

    if (!isValidIdentifierChar(currentChar) && !isQuoted) {
      break;
    }
    end++;
  }

  return { start, end };
};

export const QueryErrorHighlighter = ({
  errorPosition,
  errorMessage,
}: {
  errorPosition: number;
  errorMessage: string;
}) => {
  const { sql } = useResultContext();
  const tooltiDescription = useMemo(
    () => (
      <span className="flex flex-row gap-2 items-center">
        <XIcon className="size-3 stroke-red-700 border border-red-800 rounded-full" />
        {capitalizeFirstChar(errorMessage)}
      </span>
    ),
    [errorMessage]
  );
  const { start, end } = findTokenBounds(sql, errorPosition);

  const beforeError = sql.slice(0, start);
  const errorToken = sql.slice(start, end);
  const afterError = sql.slice(end);

  return (
    <code
      className="text-xs text-muted-foreground/50 py-0.5 rounded-sm whitespace-pre-wrap select-text"
      onClick={preventDefault}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
    >
      {beforeError}
      <SmallTooltip
        disableHoverableContent={false}
        delayDuration={100}
        className="cursor-text z-50"
        description={tooltiDescription}
      >
        <span
          className="decoration-wavy underline decoration-red-800 select-text"
          onMouseDown={stopPropagation}
        >
          {errorToken}
        </span>
      </SmallTooltip>
      {afterError}
    </code>
  );
};

export const capitalizeFirstChar = (str: string | undefined) => {
  if (!str) return ""; // Handle empty string
  return str && str.charAt(0).toUpperCase() + str.slice(1);
};

export const isSevere = (severity: string) => {
  return severity === "ERROR" || severity === "FATAL" || severity === "PANIC";
};

export const SeverityCircle = ({ severity }: { severity: string }) => {
  switch (severity) {
    case "ERROR":
    case "FATAL":
    case "PANIC":
      return (
        <div className="rounded-full ring-1 ring-inset ring-red-600 bg-opacity-50 size-2.5 flex items-center">
          <XIcon className="size-2.5 stroke-red-600" />
        </div>
      );
    case "WARNING":
      return (
        <div className="rounded-full bg-yellow-600 bg-opacity-50 size-2.5 flex items-center">
          <div className="m-auto rounded-full bg-yellow-600 size-1.5"></div>
        </div>
      );
    case "NOTICE":
    case "DEBUG":
    case "INFO":
    case "LOG":
      return (
        <div className="rounded-full bg-slate-600 bg-opacity-50 size-3 flex items-center">
          <div className="m-auto rounded-full bg-slate-600 size-1.5"></div>
        </div>
      );
    default:
      return <></>;
  }
};

const ErrorOrNotice = ({ className, message }: Props) => {
  return (
    <div className={className}>
      <div className={cn("flex flex-row flex-shrink-0 select-text")}>
        {/* The pre-line is to render the \n in the notice message from `\h` or `\?` meta-commands */}
        <p
          className="text-xs select-text text-muted-foreground font-mono"
          style={{ whiteSpace: "pre-line" }}
          onMouseDown={stopPropagation}
        >
          {capitalizeFirstChar(message.message)}
          {message.code && (
            <span className="ml-2 text-xs text-muted-foreground/50 select-text">
              Code {capitalizeFirstChar(message.code)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ErrorOrNotice;

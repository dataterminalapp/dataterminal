import { Data } from "@/features/result";
import { Table, Timing } from "@/components/table";
import { useResultContext } from "@/contexts/result";
import { ClientResult } from "@/services/local/types";
import { stopPropagation } from "../../utils";

// Duplicated const, otherwise it is not possible to compile.
export const META_COMMAND_ID = "META_COMMAND";

const DefaultMessage = () => {
  const { analyze } = useResultContext();

  if (analyze) {
    return (
      <div className="border rounded bg-muted/20 p-2 w-80">
        <p
          onMouseDown={stopPropagation}
          className="text-muted-foreground font-mono select-text pt-0.5"
        >
          No rows returned
        </p>
      </div>
    );
  } else {
    return (
      <div>
        <p
          onMouseDown={stopPropagation}
          className="text-muted-foreground font-mono select-text pt-0.5"
        >
          No rows returned
        </p>
        <Timing className="mt-1" />
      </div>
    );
  }
};

const EmptyRowMessage = () => {
  return (
    <div>
      <p
        onMouseDown={stopPropagation}
        className="text-muted-foreground font-mono select-text pt-0.5"
      >
        No columns returned
      </p>
      <Timing className="mt-1" />
    </div>
  );
};

export const SelectCommand = ({ data, className }: Props) => {
  const rows = data?.rows;
  const fields = data?.fields;

  if (fields && rows && rows.length > 0) {
    const [firstQueryResult] = rows;
    if (firstQueryResult.length === 0) {
      return <EmptyRowMessage />;
    }
    return (
      <Table className={className} columns={fields} data={rows} limited dense />
    );
  } else {
    return <DefaultMessage />;
  }
};

const InsertCommand = ({ data }: { data?: Data }) => {
  if (data && data.rows.length > 0) {
    return <SelectCommand data={data} className="pt-1.5" />;
  }

  return (
    <div>
      <p
        onMouseDown={stopPropagation}
        className="text-muted-foreground font-mono select-text pt-0.5"
      >
        {data?.rowCount} {data?.rowCount === 1 ? "row" : "rows"} inserted
      </p>
      <Timing className="mt-1" />
    </div>
  );
};

const UpdateCommand = ({ data }: { data?: Data }) => {
  if (data && data.rows.length > 0) {
    return <SelectCommand data={data} className="pt-1.5" />;
  }

  return (
    <div>
      <p
        onMouseDown={stopPropagation}
        className="text-muted-foreground font-mono select-text pt-0.5"
      >
        {data?.rowCount} {data?.rowCount === 1 ? "row" : "rows"} updated
      </p>
      <Timing className="mt-1" />
    </div>
  );
};

const DeleteCommand = ({ data }: { data?: Data }) => {
  if (data && data.rows.length > 0) {
    return <SelectCommand data={data} className="pt-1.5" />;
  }

  return (
    <div>
      <p
        onMouseDown={stopPropagation}
        className="text-muted-foreground font-mono select-text pt-0.5"
      >
        {data?.rowCount} {data?.rowCount === 1 ? "row" : "rows"} deleted
      </p>
      <Timing className="mt-1" />
    </div>
  );
};

const SuccessfulCommand = ({
  command,
  data,
}: {
  command?: string;
  data?: Data;
}) => {
  if (data && data.rows.length > 0) {
    return <SelectCommand data={data} className="pt-1.5" />;
  }
  return (
    <div>
      <p
        onMouseDown={stopPropagation}
        className="text-muted-foreground font-mono select-text pt-0.5"
      >
        Successful {command || "command"}.
      </p>
      <Timing className="mt-1" />
    </div>
  );
};

const MetaCommand = () => {
  return (
    <div>
      <Timing className="mt-1" />
    </div>
  );
};

interface Props {
  data?: ClientResult;
  className?: string;
}

const Command = ({ data }: Props) => {
  const command = data?.command;
  switch (command) {
    case "SELECT":
      return <SelectCommand data={data} className="pt-1.5" />;
    case "INSERT":
      return <InsertCommand data={data} />;
    case "UPDATE":
      return <UpdateCommand data={data} />;
    case "DELETE":
      return <DeleteCommand data={data} />;
    case META_COMMAND_ID:
      return <MetaCommand />;
    case undefined:
    case null:
      return <SelectCommand data={data} className="pt-1.5" />;
    default:
      return <SuccessfulCommand data={data} command={command} />;
  }
};

export default Command;

import DeleteDialog from "@/components/utils/deleteDialog";
import { format } from "@/components/utils/formatter";
import {
  resultAllDataRowsDeleted,
  resultDataRowsDeleted,
  resultDataRowsDeletedFailureRecovery,
} from "@/features/result";
import { BaseEntityType, SchemaTable, SchemaView } from "@/features/schema";
import { useToast } from "@/hooks/useToast";
import useQuery from "@/hooks/useQuery";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { APIError } from "../../../../services/error";
import { useCallback, useMemo } from "react";

interface PrimaryKey {
  attnum: number;
  index: number;
  name: string;
  type: string;
}

function buildStatement(
  entity: SchemaTable | SchemaView,
  rows: unknown[][] | undefined,
  primaryKeys: Array<PrimaryKey>,
  allRowsSelected?: boolean,
  rowSelection?: number[] | undefined
) {
  if (allRowsSelected) {
    return format("TRUNCATE TABLE %I;", entity.name);
  } else if (rowSelection && rows) {
    const selectedRowsIndexes = rowSelection;
    const selectedRows = selectedRowsIndexes.map((x) => rows[x]);

    const values = selectedRows.map((row) => {
      const types = primaryKeys
        .map((pkIndex) =>
          format(
            // We need to add the array because the formatter will not take care of adding them.
            // As difference of JSONB, there is no need to handle recursive array, since Postgres
            // doesn't support them.
            Array.isArray(row[pkIndex.attnum - 1]) ? "ARRAY[%L]" : "%L",
            row[pkIndex.attnum - 1]
          )
        )
        .join(", ");

      if (primaryKeys.length === 1) {
        return types;
      } else {
        return `(${types})`;
      }
    });

    const placeholders = primaryKeys
      .map(({ name }) => format("%I", name))
      .join(", ");

    const statement = format(
      `DELETE FROM %I
WHERE (${placeholders})
IN (${values.join(", ")});`,
      entity.name
    );

    return statement;
  }
}

const Dialog = ({
  allRowsSelected,
  entity,
  resultId,
  open,
  onOpenChanged,
}: {
  allRowsSelected: boolean;
  entity: SchemaTable | SchemaView;
  resultId: string;
  open: boolean;
  onOpenChanged: (open: boolean) => void;
}) => {
  /**
   * Contexts
   */
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { backQuery } = useQuery({});

  /**
   * Selectors
   */
  const rows = useAppSelector(
    (state) => state.results.entities[resultId]?.data?.rows
  );
  const rowSelection = useAppSelector(
    (state) => state.results.entities[resultId]?.uiState.rowSelection
  );
  const rowSelectionLength = useAppSelector(
    (state) => state.results.entities[resultId]?.uiState.rowSelectionLength
  );

  /**
   * Memos
   */
  const primaryKeys = useMemo(() => {
    const primaryKeys: Array<PrimaryKey> = [];

    if (entity) {
      entity.children.forEach((x, index) => {
        if (x.key?.type === "PRIMARY") {
          primaryKeys.push({
            attnum: x.attnum,
            type: x.columnType,
            name: x.name,
            index,
          });
        }
      });
    }

    return primaryKeys;
  }, [entity]);
  const statement: string | undefined = useMemo(() => {
    return buildStatement(
      entity,
      rows,
      primaryKeys,
      allRowsSelected,
      rowSelection
    );
  }, [entity, rows, primaryKeys, allRowsSelected, rowSelection]);

  /**
   * Callbacks
   */
  const onDeleteDialogConfig = useCallback(async () => {
    if (!statement) return;

    try {
      onOpenChanged(false);
      if (entity && rows) {
        const rowsBackup = rows;
        const handleBackup = () => {
          dispatch(
            resultDataRowsDeletedFailureRecovery({
              id: resultId,
              rows: rowsBackup,
            })
          );
        };

        if (allRowsSelected) {
          dispatch(
            resultAllDataRowsDeleted({
              id: resultId,
            })
          );
          try {
            await backQuery(statement, "truncating table");
          } catch (err) {
            handleBackup();
            console.error("Error deleting everything from the entity: ", err);
          }
        } else if (rowSelection) {
          const selectedRowsIndexes = rowSelection;
          try {
            dispatch(
              resultDataRowsDeleted({
                id: resultId,
                rowsDeleted: selectedRowsIndexes,
              })
            );
            const { error } = await backQuery(statement, "deleting rows");
            if (error) {
              handleBackup();
            }
          } catch (err) {
            console.error("Error processing query: ", err);
            handleBackup();
          }
        }
      }
    } catch (err) {
      console.error("Error processing query: ", err);
      toast({
        title: "Error deleting rows",
        description: APIError.normalizeError(err, "Unknown issue").message,
      });
    }
  }, [allRowsSelected, primaryKeys, resultId, rowSelection, rows]);

  return (
    <DeleteDialog
      options={{
        description: `This action cannot be undone. This will permanently delete ${
          allRowsSelected ? "ALL the rows" : "the selected row(s)"
        }.`,
        title:
          (allRowsSelected &&
            `Are you sure you want to clear this ${
              entity?.type === BaseEntityType.Table ? "table" : "view"
            }?`) ||
          (rowSelectionLength && rowSelectionLength <= 1
            ? "Are you sure you want to remove this row?"
            : "Are you sure you want to remove these rows?"),
      }}
      open={open}
      code={statement}
      onCloseAutoFocus={() => onOpenChanged(false)}
      onConfirm={onDeleteDialogConfig}
      onCancel={() => onOpenChanged(false)}
    />
  );
};

export default Dialog;

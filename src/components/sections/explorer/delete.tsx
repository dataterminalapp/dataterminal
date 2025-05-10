import React, { useCallback, useMemo, useRef } from "react";
import DeleteDialog from "../../utils/deleteDialog";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import {
  entityToDeleteCleared,
  SimplifiedSchemaEntity,
} from "@/features/explorer";
import { useFocusContext } from "@/contexts/focus";
import useQuery from "@/hooks/useQuery";
import {
  BaseEntityType,
  baseEntityTypeToString,
  entityLogicallyRecovered,
  entityLogicallyRemoved,
} from "@/features/schema";
import { useToast } from "@/hooks/useToast";
import { format } from "../../utils/formatter";

function dropEntitySql(
  entityType: BaseEntityType,
  entityName: string,
  schema: string,
  tableName?: string
) {
  switch (entityType) {
    case BaseEntityType.Schema:
      return format(`DROP SCHEMA IF EXISTS %I;`, entityName);
    case BaseEntityType.Database:
      return format(`DROP DATABASE IF EXISTS %I;`, entityName);
    case BaseEntityType.Table:
      return format(`DROP TABLE IF EXISTS %I.%I;`, schema, entityName);
    case BaseEntityType.View:
      return format(`DROP VIEW IF EXISTS %I.%I;`, schema, entityName);
    case BaseEntityType.Index:
      return format(`DROP INDEX IF EXISTS %I.%I;`, schema, entityName);
    case BaseEntityType.MaterializedView:
      return format(
        `DROP MATERIALIZED VIEW IF EXISTS %I.%I;`,
        schema,
        entityName
      );
    case BaseEntityType.UserFunction:
    case BaseEntityType.Function:
      return `DROP FUNCTION IF EXISTS ${schema}.${entityName}();`;
    case BaseEntityType.Procedure:
      return `DROP PROCEDURE IF EXISTS ${schema}.${entityName}();`;
    case BaseEntityType.Column:
      if (!tableName) {
        return;
      }
      return format(
        `ALTER TABLE %I.%I DROP COLUMN IF EXISTS %I;`,
        schema,
        tableName,
        entityName
      );
  }
}

const DeleteTreeNodeDialog = () => {
  const { backQuery } = useQuery({});
  const { setFocus } = useFocusContext();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const entityToDelete = useAppSelector(
    (state) => state.explorer.entityToDelete
  );
  const code = useMemo(() => {
    if (!entityToDelete) return undefined;
    try {
      const dropSql = dropEntitySql(
        entityToDelete.type,
        entityToDelete.name,
        entityToDelete.schema,
        entityToDelete.table
      );
      return dropSql;
    } catch (err) {
      console.error("Error building SQL: ", err);
    }
  }, [entityToDelete]);

  // Using refs is tricky but necessary to handle onCloseAutoFocus correctly.
  const entityRef = useRef<SimplifiedSchemaEntity | undefined | null>(null);
  const deleteActionRef = useRef<boolean>(false);

  const handleOnDeleteConfirm = useCallback(
    async (entity: SimplifiedSchemaEntity) => {
      try {
        const dropSql = dropEntitySql(
          entity.type,
          entity.name,
          entity.schema,
          entity.table
        );
        dispatch(
          entityLogicallyRemoved({
            id: entity.id,
            type: entity.type,
          })
        );

        if (!dropSql) {
          console.warn("Entity type to delete is not present.");
          return;
        }

        const { error } = await backQuery(
          dropSql,
          `deleting ${baseEntityTypeToString(entity.type).toLowerCase()}`
        );

        if (error) {
          console.error("Error deleting entity: ", error);
          toast({
            title: "Error deleting entity",
            description: error.message,
          });
          dispatch(
            entityLogicallyRecovered({
              id: entity.id,
              type: entity.type,
            })
          );
        }
      } catch (err) {
        console.error("Error deleting entity: ", err);
      }
    },
    [backQuery]
  );

  const handleOnCloseAutoFocus = useCallback(() => {
    if (entityRef.current) {
      setFocus("explorer", "node", {
        id:
          deleteActionRef.current === true
            ? entityRef.current.parentId
            : entityRef.current.id,
        from: "explorer/delete/onCloseAutoFocus",
      });

      const shouldDelete = deleteActionRef.current;
      if (shouldDelete) {
        handleOnDeleteConfirm(entityRef.current);
      }
    }

    // Clean refs.
    entityRef.current = null;
    deleteActionRef.current = false;
    dispatch(entityToDeleteCleared());
  }, [dispatch, handleOnDeleteConfirm, entityToDeleteCleared]);

  return (
    <DeleteDialog
      code={code}
      open={!!entityToDelete}
      options={{
        description: `This action cannot be undone. This will permanently delete the following ${baseEntityTypeToString(
          entityToDelete?.type
        ).toLowerCase()}:`,
        object: entityToDelete?.name,
      }}
      onConfirm={() => {
        entityRef.current = entityToDelete;
        deleteActionRef.current = true;
        dispatch(entityToDeleteCleared());
      }}
      onCancel={() => {
        entityRef.current = entityToDelete;
        dispatch(entityToDeleteCleared());
      }}
      onCloseAutoFocus={handleOnCloseAutoFocus}
    />
  );
};

export default DeleteTreeNodeDialog;

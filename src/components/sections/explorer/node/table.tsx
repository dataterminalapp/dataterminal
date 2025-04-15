import {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ContextMenu from "../contextMenu";
import { useFocusContext } from "@/contexts/focus";
import useQuery from "@/hooks/useQuery";
import DetectBoardKey from "../../../utils/shortcuts/detectBoardKey";
import { ChevronRight } from "lucide-react";
import HighlightedText from "../highlightedText";
import { TreeNode } from "../types";
import { cn } from "@/lib/utils";
import { FuseResultMatch } from "fuse.js";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { tabAdded } from "@/features/tabs";
import { focusChanged } from "@/features/focus";
import { entityToDeleteAssigned } from "@/features/explorer";
import { TABLES_NODE_ID, VIEWS_NODE_ID } from "@/hooks/useTreeState";
import { panelAdded } from "@/features/panel";
import {
  BaseEntityType,
  entityNameChanged,
  SchemaTable,
  SchemaView,
} from "@/features/schema";
import { format } from "@/components/utils/formatter";
import { stopPropagation } from "@/components/utils";
import { AppDispatch } from "@/store";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { Connection } from "@/features/connections";
import { nanoid } from "@reduxjs/toolkit";

export const handleOnBrowserShortcut = (
  dispatch: AppDispatch,
  // We need the connection rather than the connection ID.
  // In case the connection is deleted, we lose all the information related to it.
  connection: Connection,
  entity: SchemaTable | SchemaView
) => {
  const panelAddedResult = dispatch(
    panelAdded({
      layout: "Terminal",
      limit: false,
    })
  );
  const tabAddedResult = dispatch(
    tabAdded("Browser", {
      browser: {
        entity,
        connection,
      },
      panelIds: [panelAddedResult.payload.id],
    })
  );
  dispatch(
    focusChanged({
      tabId: tabAddedResult.payload.id,
      panelId: tabAddedResult.payload.options.panelIds[0],
    })
  );
};

export const handleOnAuditShortcut = (
  dispatch: AppDispatch,
  connection: Connection,
  entity: SchemaTable | SchemaView
) => {
  const panelAddedResult = dispatch(
    panelAdded({
      layout: "Terminal",
      limit: false,
    })
  );
  const tabAddedResult = dispatch(
    tabAdded("Audit", {
      audit: {
        entity,
        connection,
      },
      panelIds: [panelAddedResult.payload.id],
    })
  );
  dispatch(
    focusChanged({
      tabId: tabAddedResult.payload.id,
      panelId: tabAddedResult.payload.options.panelIds[0],
    })
  );
};

const Table = ({
  node,
  className,
  isExpanded,
  isFocused,
  matches,
}: {
  className: string;
  node: TreeNode;
  isExpanded: boolean;
  isFocused: boolean;
  matches?: readonly FuseResultMatch[] | undefined;
}) => {
  const connectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );
  const connection = useAppSelector(
    (state) => connectionId && state.connections.entities[connectionId]
  );
  const dispatch = useAppDispatch();
  const { backQuery } = useQuery({});
  const { setFocus, createRef } = useFocusContext();
  const [, copy] = useCopyToClipboard();
  const name = useAppSelector(
    (state) =>
      state.schema.tables.entities[node.id]?.name ||
      state.schema.views.entities[node.id]?.name
  );
  const schemas = useAppSelector((state) => state.workspace.schema.list);
  const schemaId = useAppSelector((state) => state.workspace.schema.current);
  const schemaName = schemas.find((x) => x.id === schemaId)?.name;
  const entity = useAppSelector((state) => state.schema.entities[node.id]);
  const [onRename, setOnRename] = useState(false);
  const [editingName, setEditingName] = useState(name);
  const lastReqRef = useRef(nanoid());
  const renamingConfirmedRef = useRef<boolean>(false);

  useEffect(() => {
    if (onRename) {
      setFocus("explorer", "input", {
        id: node.id,
        from: "explorer/tree/column/useEffect",
      });
    }
  }, [onRename]);

  const handleOnRename = useCallback(
    async (newName: string) => {
      setOnRename(false);
      const originalName = name;
      dispatch(entityNameChanged({ id: node.id, name: newName }));

      if (newName && newName !== originalName) {
        const updateSQL = format(
          `ALTER TABLE %I.%I RENAME TO %I;`,
          schemaName,
          originalName,
          newName.trim()
        );
        const reqId = nanoid();
        lastReqRef.current = reqId;
        const { error } = await backQuery(updateSQL, "renaming table");

        if (lastReqRef.current !== reqId) {
          return;
        }
        if (error) {
          dispatch(entityNameChanged({ id: node.id, name: originalName }));
          setEditingName(newName);
        }
      } else {
        dispatch(entityNameChanged({ id: node.id, name: originalName }));
        setEditingName(originalName);
      }
    },
    [node.id, name]
  );

  const handleOnBlur = useCallback(() => {
    // Return to the original state
    if (renamingConfirmedRef.current === false) {
      setEditingName(name);
    }
    setOnRename(false);
  }, [name]);

  const handleOnRenameKeyDown: KeyboardEventHandler<HTMLInputElement> =
    useCallback(
      (e) => {
        stopPropagation(e);

        if (e.key === "Enter") {
          renamingConfirmedRef.current = true;
          setOnRename(false);
          setFocus("explorer", "node", {
            id: node.id,
            from: "explorer/node/table/handleOnRenameKeyDown",
          });
          handleOnRename(e.currentTarget.value);
        } else if (e.key === "Escape") {
          setOnRename(false);
          setFocus("explorer", "node", {
            id: node.id,
            from: "explorer/node/table/handleOnRenameKeyDown",
          });
        }
      },
      [handleOnRename, node.id]
    );

  const handleOnBrowser = useCallback(
    () =>
      connection &&
      handleOnBrowserShortcut(
        dispatch,
        connection,
        entity as unknown as SchemaTable | SchemaView
      ),
    [dispatch, connectionId, entity]
  );

  const handleOnAudit = useCallback(
    () =>
      connection &&
      handleOnAuditShortcut(
        dispatch,
        connection,
        entity as unknown as SchemaTable | SchemaView
      ),
    [dispatch, connectionId, entity]
  );

  const handleOnDelete = useCallback(() => {
    if (node.type) {
      dispatch(
        entityToDeleteAssigned({
          entityToDelete: {
            id: node.id,
            name: name,
            type: node.type,
            parentId:
              node.type === BaseEntityType.Table
                ? TABLES_NODE_ID
                : VIEWS_NODE_ID,
          },
        })
      );
    } else {
      console.warn("No entity type detected in tree node to delete.");
    }
  }, [dispatch, node.id, node.type]);

  const handleOnCopy = useCallback(() => {
    copy(node.name);
  }, [copy, node.name]);

  return (
    <>
      <ContextMenu
        type={BaseEntityType.Table}
        onRename={() => setOnRename(true)}
        onDelete={handleOnDelete}
        onBrowser={handleOnBrowser}
        onAudit={handleOnAudit}
        onCopy={handleOnCopy}
      >
        {/* Can't capture CMD + Entere here for Browser shortcut. It will be captured by the <li> el. */}
        {isFocused && (
          <DetectBoardKey
            boardKey="Enter"
            stopPropagation
            preventDefault
            onKeyPress={() => {
              setOnRename(true);
            }}
          />
        )}
        {isFocused && (
          <DetectBoardKey
            meta
            boardKey="Backspace"
            stopPropagation
            preventDefault
            onKeyPress={handleOnDelete}
          />
        )}
        <div
          className={className}
          style={{
            fontSize: "11px",
            lineHeight: "14px",
          }}
        >
          <ChevronRight
            className={cn(
              "size-3.5 flex-shrink-0 transition-all stroke-muted-foreground",
              isExpanded && "rotate-90",
              isFocused && "stroke-primary"
            )}
          />
          <p
            className={cn(
              "w-32 flex-shrink-0 font-sans text-xs",
              onRename && "hidden"
            )}
          >
            <HighlightedText text={name} matches={matches} />
          </p>

          <input
            type="text"
            className={cn(
              // Do not use hidden/invisible otherwise is not possible to focus.
              onRename ? "pl-2 visible w-full" : "w-0",
              "h-6 rounded outline-none ring-0 bg-muted-foreground/20 transition-none"
            )}
            onKeyDown={handleOnRenameKeyDown}
            onChange={(e) => setEditingName(e.target.value)}
            onClick={stopPropagation}
            onBlur={handleOnBlur}
            defaultValue={name}
            value={editingName}
            ref={createRef("explorer", "input", { id: node.id })}
          />
        </div>
      </ContextMenu>
    </>
  );
};

export default Table;

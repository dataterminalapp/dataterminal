import { cn } from "@/lib/utils";
import {
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import HighlightedText from "../highlightedText";
import { FuseResultMatch } from "fuse.js";
import useQuery from "@/hooks/useQuery";
import DetectBoardKey from "../../../utils/shortcuts/detectBoardKey";
import { useFocusContext } from "@/contexts/focus";
import ContextMenu from "../contextMenu";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../ui/command";
import { CheckIcon } from "lucide-react";
import { Button } from "../../../ui/button";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { entityToDeleteAssigned } from "@/features/explorer";
import { TreeNode } from "../types";
import { typeToIcon } from "@/components/icons/columnTypeIcon";
import {
  BaseEntityType,
  columnTypeChanged,
  entityNameChanged,
  SchemaColumn,
} from "@/features/schema";
import {
  preventDefaultAndStopPropagation,
  stopPropagation,
} from "@/components/utils";
import { format } from "@/components/utils/formatter";
import SmallTooltip from "@/components/utils/SmallTooltip";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/useToast";
import { QuestionMarkIcon } from "@radix-ui/react-icons";
import { nanoid } from "@reduxjs/toolkit";

const postgresPrimitiveTypes = [
  "bigint",
  "bit",
  "bit varying",
  "boolean",
  "box",
  "bpchar",
  "bytea",
  "char", // Alias for character
  "character",
  "character varying",
  "cidr",
  "circle",
  "date",
  "decimal",
  "double precision",
  "inet",
  "integer",
  "interval",
  "json",
  "jsonb",
  "line",
  "lseg",
  "macaddr",
  "macaddr8",
  "money",
  "numeric",
  "path",
  "pg_lsn",
  "point",
  "polygon",
  "real",
  "smallint", // Added smallint type
  "text",
  "time",
  "time with time zone",
  "timestamp",
  "timestamp with time zone",
  "tsquery",
  "tsvector",
  "txid_snapshot",
  "uuid",
  "varchar", // Alias for character varying
  "xml",
];

interface Props {
  className?: string;
  node: SchemaColumn;
  matches?: readonly FuseResultMatch[] | undefined;
  isFocused?: boolean;
  disabled?: boolean;
}

const TypeSelector = ({
  className,
  value,
  open,
  hidden,
  disabled,
  onOpenChange,
  onValueChange,
  onClick,
  onCloseAutoFocus,
  onKeyDown,
}: {
  className?: string;
  value: string;
  open: boolean;
  hidden: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onClick: () => void;
  onCloseAutoFocus: (event: Event) => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
}) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <SmallTooltip asChild description={value}>
        <PopoverTrigger
          className={cn(
            "focus:outline-0 foucs:ring-0 focus-visible:outline-0 focus-visible:ring-0 focus-visible:bg-none",
            "focus:outline-none focus:ring-0 focus-within:ring-0 focus-within:outline-none",
            "ring-0 outline-none outline-0",
            "overflow-hidden",
            hidden && "opacity-0 -translate-x-full w-0 px-0",
            className,
            "p-0"
          )}
          style={{
            fontSize: "11px",
            lineHeight: "14px",
          }}
          disabled={disabled}
        >
          <Button
            variant="ghost"
            size="icon"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "group h-fit text-left rounded-sm p-1 transition-all text-muted-foreground text-xs",
              "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-none",
              open && "bg-muted-foreground/20",
              hidden && "opacity-0 translate-x-4 w-0 px-0",
              "disabled:opacity-100 disabled:text-muted-foreground",
              "px-1"
            )}
            onClick={onClick}
            disabled={disabled}
          >
            {typeToIcon[value] || <QuestionMarkIcon />}
          </Button>
        </PopoverTrigger>
      </SmallTooltip>
      <PopoverContent
        onKeyDown={onKeyDown}
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[250px] p-0"
        style={{
          fontSize: "11px",
          lineHeight: "14px",
        }}
      >
        <Command
          className="bg-panel"
          onMouseDown={preventDefaultAndStopPropagation}
          onClick={preventDefaultAndStopPropagation}
        >
          <CommandInput placeholder="Search type..." className="h-9" />
          <CommandList>
            <CommandEmpty>No type found.</CommandEmpty>
            <CommandGroup>
              {postgresPrimitiveTypes.map((primitiveType) => (
                <CommandItem
                  key={primitiveType}
                  value={primitiveType}
                  onSelect={onValueChange}
                  className="gap-2"
                >
                  <span className="opacity-60">
                    {typeToIcon[primitiveType]}
                  </span>
                  {primitiveType}
                  <CheckIcon
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === primitiveType ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const KeyIndicator = ({
  className,
  node,
}: {
  className?: string;
  node: SchemaColumn;
}) => {
  const isPrimary = node.key && node.key.type === "PRIMARY";
  const isForeign = node.key && node.key.type === "FOREIGN";
  const isForeignPrimary = node.key && node.key.type === "FOREIGN_PRIMARY";

  return (
    <SmallTooltip
      description={
        (isPrimary && "Primary key") ||
        (isForeign && "Foreign key") ||
        (isForeignPrimary && "Foreign Primary key") ||
        ""
      }
      disabled={!node.key}
      disableHoverableContent
    >
      <div
        className={cn(
          "w-7",
          node.key &&
            "bg-muted-foreground/20 shadow-sm shadow-black/35 text-xs rounded p-0.5 px-1",
          /* It is important to make a difference. The P and F are too similar. */
          isPrimary && "text-primary/65",
          isForeign && "text-muted-foreground/65",
          isForeignPrimary && "flex flex-col text-xs leading-none",
          className
        )}
        style={{
          fontSize: isForeignPrimary ? "8px" : "11px",
        }}
      >
        {isPrimary && "PK"}
        {isForeign && "FK"}
        {isForeignPrimary && (
          <>
            <span>PK</span>
            <span>FK</span>
          </>
        )}
      </div>
    </SmallTooltip>
  );
};

const Column = ({ className, isFocused, matches, node }: Props) => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { backQuery } = useQuery({});
  const { setFocus, createRef } = useFocusContext();
  const [, copy] = useCopyToClipboard();
  const name = useAppSelector(
    (state) => state.schema.columns.entities[node.id]?.name
  );
  const columnType = useAppSelector(
    (state) => state.schema.columns.entities[node.id]?.columnType
  );
  const schemas = useAppSelector((state) => state.workspace.schema.list);
  const schemaId = useAppSelector((state) => state.workspace.schema.current);
  const schemaName = schemas.find((x) => x.id === schemaId)?.name;

  const [editingName, setEditingName] = useState(name);
  const [onRename, setOnRename] = useState(false);
  const [onTypeChange, setOnTypeChange] = useState(false);
  const lastColumnTypeReqRef = useRef(nanoid());
  const lastColumnNameReqRef = useRef(nanoid());
  const renamingConfirmedRef = useRef<boolean>(false);

  useEffect(() => {
    if (onRename) {
      setFocus("explorer", "input", {
        id: node.id,
        from: "explorer/tree/column/useEffect",
      });
    }
  }, [node.id, onRename]);

  const handleOnRename = useCallback(
    async (newName: string) => {
      setOnRename(false);
      const originalName = name;

      try {
        if (newName && newName !== originalName) {
          dispatch(entityNameChanged({ id: node.id, name: newName }));

          const updateSQL = format(
            `
              ALTER TABLE %I.%I
              RENAME COLUMN %I TO %I;
          `,
            schemaName,
            node.table,
            originalName,
            newName.trim()
          );

          const reqId = nanoid();
          lastColumnNameReqRef.current = reqId;
          const { error } = await backQuery(updateSQL, "renaming column");

          if (lastColumnNameReqRef.current !== reqId) {
            return;
          }

          if (error) {
            dispatch(entityNameChanged({ id: node.id, name: originalName }));
            setEditingName(originalName);
          }
        }
      } catch {
        dispatch(entityNameChanged({ id: node.id, name: originalName }));
        setEditingName(originalName);
      }
    },
    [schemaName, node.table, node.id, name]
  );

  const handleOnRenameKeyDown: KeyboardEventHandler<HTMLInputElement> =
    useCallback(
      (e) => {
        stopPropagation(e);

        if (e.key === "Enter") {
          renamingConfirmedRef.current = true;
          setOnRename(false);
          setFocus("explorer", "node", {
            id: node.id,
            from: "explorer/node/column/handleOnRenameKeyDown",
          });
          handleOnRename(e.currentTarget.value);
        } else if (e.key === "Escape") {
          setOnRename(false);
          setFocus("explorer", "node", {
            id: node.id,
            from: "explorer/node/column/handleOnRenameKeyDown",
          });
        }
      },
      [handleOnRename]
    );

  const handleOnBlur = useCallback(() => {
    // Return to the original state
    if (renamingConfirmedRef.current === false) {
      setEditingName(name);
    }
    setOnRename(false);
  }, [name]);

  const onColumnTypeValueChange = useCallback(
    async (value: string) => {
      const reqId = nanoid();
      lastColumnTypeReqRef.current = reqId;

      const originalColumnType = node.columnType;
      dispatch(columnTypeChanged({ id: node.id, columnType: value }));
      setOnTypeChange(false);

      try {
        const updateSQL = format(
          `
          ALTER TABLE %I.%I
          ALTER COLUMN %I TYPE %s;
      `,
          schemaName,
          node.table,
          name,
          value
        );

        try {
          const { error } = await backQuery(updateSQL, "altering column");

          if (lastColumnTypeReqRef.current !== reqId) {
            return;
          }

          if (error) {
            dispatch(
              columnTypeChanged({ id: node.id, columnType: originalColumnType })
            );
          }
        } catch {
          toast({
            title: "Error altering column",
          });
        }
      } catch {
        toast({
          title: "Error formatting query to alter column",
        });
      }

      if (lastColumnTypeReqRef.current === reqId) {
        renamingConfirmedRef.current = false;
      }
    },
    [schemaName, node, name, node.id]
  );

  const handleOnTypeClick = useCallback(() => {
    setOnTypeChange(true);
  }, []);

  const handleOnRenameDoubleClick: MouseEventHandler = useCallback(
    (e) => {
      preventDefaultAndStopPropagation(e);
      setOnRename(true);
      setFocus("explorer", "input", {
        id: node.id,
        from: "explorer/handleOnRenameDoubleClick",
      });
    },
    [node.id]
  );

  const handleOnKeyDownTypeChange: KeyboardEventHandler<HTMLInputElement> =
    useCallback(
      (e) => {
        if (e.key === "Escape") {
          preventDefaultAndStopPropagation(e);
          setOnTypeChange(false);
          setFocus("explorer", "node", {
            id: node.id,
            from: "explorer/node/column/handleOnKeyDownTypeChange",
          });
          return;
        } else {
          stopPropagation(e);
        }
      },
      [node.id]
    );

  const handleOnOpenChange = useCallback((o: boolean) => {
    if (o) {
      return;
    }
    setOnTypeChange(o);
  }, []);

  const handleOnDelete = useCallback(() => {
    const parentId = (node as unknown as TreeNode).parent?.id;

    if (parentId) {
      dispatch(
        entityToDeleteAssigned({
          entityToDelete: {
            id: node.id,
            name,
            type: BaseEntityType.Column,
            parentId,
            table: node.table,
          },
        })
      );
    } else {
      console.warn("Trying to delete a column without parent.");
    }
  }, [dispatch, node]);

  const handleOnCopy = useCallback(() => {
    copy(name, 150);
  }, [copy]);
  return (
    <>
      <ContextMenu
        type={node.type}
        parentType={(node as unknown as TreeNode).parent?.type}
        onRename={(e) => {
          setOnRename(true);
          stopPropagation(e);
        }}
        onChangeType={() => setOnTypeChange(true)}
        onDelete={handleOnDelete}
        onCopy={handleOnCopy}
      >
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
            boardKey="m"
            stopPropagation
            preventDefault
            onKeyPress={() => setOnTypeChange(true)}
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
          className={cn(
            className,
            onRename && "gap-0",
            onRename ||
              (onTypeChange &&
                "flex flex-shrink-0 items-center rounded-sm overflow-hidden"),
            "relative"
          )}
        >
          <TypeSelector
            hidden={onRename}
            onCloseAutoFocus={() => {
              setFocus("explorer", "node", {
                id: node.id,
                from: "explorer/node/typeselector/onCloseAutoFocus",
              });
            }}
            onClick={handleOnTypeClick}
            onKeyDown={handleOnKeyDownTypeChange}
            onOpenChange={handleOnOpenChange}
            onValueChange={onColumnTypeValueChange}
            open={onTypeChange}
            value={columnType}
            className="flex-shrink-0 px-2"
            disabled={
              (node as unknown as TreeNode).parent?.type !==
              BaseEntityType.Table
            }
          />
          <p
            onDoubleClick={handleOnRenameDoubleClick}
            className={cn("w-32 min-w-6 truncate", onRename && "hidden")}
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
            onBlur={handleOnBlur}
            onChange={(e) => setEditingName(e.target.value)}
            onClick={stopPropagation}
            value={editingName}
            ref={createRef("explorer", "input", { id: node.id })}
          />
          <KeyIndicator
            node={node}
            className={cn("shrink-0", onRename && "hidden translate-x-10")}
          />
        </div>
      </ContextMenu>
    </>
  );
};

export default Column;

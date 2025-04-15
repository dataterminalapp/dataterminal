import React, { PropsWithChildren, useCallback, useRef } from "react";
import {
  ContextMenu as RContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuShortcut,
  ContextMenuTrigger,
  ContextMenuGroup,
} from "../../ui/context-menu";
import {
  CopyIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  TrashIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import {
  preventDefaultAndStopPropagation,
  stopPropagation,
} from "@/components/utils";
import { BaseEntityType } from "@/features/schema";
// import { AuditIcon } from "../layout/tabs";

interface Props {
  type: BaseEntityType;
  parentType?: BaseEntityType;
  onRename?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  onAddColumn?: (event: Event) => void;
  onChangeType?: (event: Event) => void;
  onBrowser?: (event: Event) => void;
  onAudit?: (event: Event) => void;
  onCopy: () => void;
}

const ContextMenu = ({
  type,
  parentType,
  children,
  onRename,
  onChangeType,
  onDelete,
  onBrowser,
  onAudit,
  onCopy,
}: Props & PropsWithChildren) => {
  const action = useRef<
    "rename" | "change_type" | "delete" | "browser" | "copy" | "audit" | null
  >(null);

  const handleOnCloseAutoFocus = useCallback((event: Event) => {
    switch (action.current) {
      case "rename":
        if (onRename) {
          onRename(event);
        }
        break;
      case "browser":
        if (onBrowser) {
          onBrowser(event);
        }
        break;
      case "audit":
        if (onAudit) {
          onAudit(event);
        }
        break;
      case "change_type":
        if (onChangeType) {
          onChangeType(event);
        }
        break;
      case "delete":
        if (onDelete) {
          onDelete(event);
        }
        break;
      case "copy":
        onCopy();
        break;
    }
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    if (open === true) {
      action.current = null;
    }
  }, []);

  return (
    <RContextMenu modal={false} onOpenChange={onOpenChange}>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent
        onClick={preventDefaultAndStopPropagation}
        onKeyDown={preventDefaultAndStopPropagation}
        onCloseAutoFocus={handleOnCloseAutoFocus}
        className="w-64 text-muted-foreground bg-panel shadow-lg shadow-black/25"
      >
        <ContextMenuGroup>
          <ContextMenuLabel>Actions</ContextMenuLabel>
          {/* {type === BaseEntityType.Table && (
            <ContextMenuItem
              onSelect={() => (action.current = "audit")}
              onClick={stopPropagation}
            >
              <AuditIcon />
              Audit
              <ContextMenuShortcut>⌘A</ContextMenuShortcut>
            </ContextMenuItem>
          )} */}
          {type === BaseEntityType.Table && (
            <ContextMenuItem
              onSelect={() => (action.current = "browser")}
              onClick={stopPropagation}
            >
              <MagnifyingGlassIcon className="size-4 ml-2 mr-3" />
              Browse
              <ContextMenuShortcut>⌘⏎</ContextMenuShortcut>
            </ContextMenuItem>
          )}
          <ContextMenuItem
            onSelect={() => (action.current = "copy")}
            onClick={stopPropagation}
          >
            <CopyIcon className="size-4 ml-2 mr-3" />
            Copy
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() => (action.current = "rename")}
            onClick={stopPropagation}
          >
            <Pencil1Icon className="size-4 ml-2 mr-3" />
            Rename
            <ContextMenuShortcut>⏎</ContextMenuShortcut>
          </ContextMenuItem>
          {type === BaseEntityType.Column &&
            parentType === BaseEntityType.Table && (
              <ContextMenuItem
                onClick={stopPropagation}
                onSelect={() => (action.current = "change_type")}
              >
                <UpdateIcon className="size-4 ml-2 mr-3" />
                Change type
                <ContextMenuShortcut>⌘M</ContextMenuShortcut>
              </ContextMenuItem>
            )}
          {type !== BaseEntityType.Function &&
            type !== BaseEntityType.UserFunction && (
              <ContextMenuItem onSelect={() => (action.current = "delete")}>
                <TrashIcon className="size-4 ml-2 mr-3" />
                Delete
                <ContextMenuShortcut>⌘←</ContextMenuShortcut>
              </ContextMenuItem>
            )}
        </ContextMenuGroup>
      </ContextMenuContent>
    </RContextMenu>
  );
};

export default ContextMenu;

import React, {
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ContextMenu from "../contextMenu";
import { useFocusContext } from "@/contexts/focus";
import useQuery from "@/hooks/useQuery";
import DetectBoardKey from "../../../utils/shortcuts/detectBoardKey";
import HighlightedText from "../highlightedText";
import { TreeNode } from "../types";
import { cn } from "@/lib/utils";
import { FuseResultMatch } from "fuse.js";
import {
  preventDefaultAndStopPropagation,
  stopPropagation,
} from "@/components/utils";
import { BaseEntityType } from "@/features/schema";
import { format } from "@/components/utils/formatter";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/useToast";
import { nanoid } from "@reduxjs/toolkit";
import { useAppSelector } from "@/hooks/useRedux";

/**
 * This code is almost identical to the `table.tsx` code.
 * @param param0
 * @returns
 */
const Function = ({
  node,
  className,
  isFocused,
  matches,
}: {
  className: string;
  node: TreeNode;
  isFocused: boolean;
  matches?: readonly FuseResultMatch[] | undefined;
}) => {
  const { toast } = useToast();
  const [, copy] = useCopyToClipboard();
  const { backQuery } = useQuery({});
  const { setFocus, createRef } = useFocusContext();

  const [onRename, setOnRename] = useState(false);
  const [name, setName] = useState(node.name);
  const schemas = useAppSelector((state) => state.workspace.schema.list);
  const schemaId = useAppSelector((state) => state.workspace.schema.current);
  const schemaName = schemas.find((x) => x.id === schemaId)?.name;
  const lastReqRef = useRef(nanoid());

  useEffect(() => {
    if (onRename) {
      setFocus("explorer", "input", {
        id: node.id,
        from: "explorer/tree/column/useEffect",
      });
    }
  }, [onRename]);

  const handleOnRenameKeyDown: KeyboardEventHandler = useCallback((e) => {
    stopPropagation(e);

    if (e.key === "Enter") {
      setOnRename(false);
      setFocus("explorer", "node", {
        id: node.id,
        from: "explorer/node/function/handleOnRenameKeyDown",
      });
    } else if (e.key === "Escape") {
      setOnRename(false);
      setFocus("explorer", "node", {
        id: node.id,
        from: "explorer/node/function/handleOnRenameKeyDown",
      });
    }
  }, []);

  const handleOnBlurRename: FocusEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      setOnRename(false);

      const newName = e.target.value;
      if (newName && newName !== node.name) {
        try {
          const updateSQL = format(
            `ALTER FUNCTION %I.%I RENAME TO %I;`,
            schemaName,
            node.name,
            newName.trim()
          );

          const reqId = nanoid();
          lastReqRef.current = reqId;
          const { error } = await backQuery(updateSQL, "renaming function");

          if (lastReqRef.current !== reqId) {
            return;
          }
          if (!error) {
            e.target.value = node.name;
          } else {
            setName(newName);
          }
        } catch (err) {
          console.error(err);
          toast({
            title: "Error altering function",
          });
        }
      } else {
        setName(node.name);
      }
    },
    [schemaName, node, toast]
  );

  const handleOnRenameDoubleClick: MouseEventHandler = useCallback(
    (e) => {
      preventDefaultAndStopPropagation(e);
      setOnRename(true);
      setFocus("explorer", "input", {
        id: node.id,
        from: "explorer/handleOnRenameDoubleClick",
      });
    },
    [setFocus]
  );

  const handleOnCopy = useCallback(() => {
    copy(node.name);
  }, [copy]);

  return (
    <>
      <ContextMenu
        type={BaseEntityType.UserFunction}
        onRename={() => setOnRename(true)}
        // onDelete={handleOnDelete}
        onCopy={handleOnCopy}
      >
        {isFocused && (
          <DetectBoardKey
            boardKey="Enter"
            stopPropagation
            preventDefault
            onKeyPress={() => setOnRename(true)}
          />
        )}
        <div
          className={className}
          style={{
            fontSize: "11px",
            lineHeight: "14px",
          }}
        >
          <p
            className={cn("w-32 flex-shrink-0 font-sans", onRename && "hidden")}
            onDoubleClick={handleOnRenameDoubleClick}
          >
            <HighlightedText text={node.name} matches={matches} />
          </p>

          <input
            type="text"
            className={cn(
              // Do not use hidden/invisible otherwise is not possible to focus.
              onRename ? "pl-2 visible w-full" : "w-0",
              "h-6 rounded outline-none ring-0 bg-muted-foreground/20 transition-none"
            )}
            onKeyDown={handleOnRenameKeyDown}
            onBlur={handleOnBlurRename}
            onChange={(e) => setName(e.target.value)}
            onClick={stopPropagation}
            defaultValue={name}
            value={name}
            ref={createRef("explorer", "input", { id: node.id })}
          />
        </div>
      </ContextMenu>
    </>
  );
};

export default Function;

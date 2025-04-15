import { cn } from "@/lib/utils";
import { ChevronRight, EyeIcon, FunctionSquare, TableIcon } from "lucide-react";
import { FuseResult, FuseResultMatch } from "fuse.js";
import { TreeNode as TNode } from "./types";
import { ChangeEventHandler, useCallback, useEffect, useState } from "react";
import { ScrollArea } from "../../ui/scroll-area";
import Navigation from "./navigation";
import { useTreeState } from "@/hooks/useTreeState";
import { BorderSolidIcon } from "@radix-ui/react-icons";
import Search from "./search";
import SmallTooltip from "../../utils/SmallTooltip";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useFocusContext } from "@/contexts/focus";
import Column from "./node/column";
import Table from "./node/table";
import DeleteTreeNodeDialog from "./delete";
import Function from "./node/function";
import { BaseEntity, BaseEntityType, SchemaColumn } from "@/features/schema";

interface Props {
  items: BaseEntity[];
  expandedNodes?: Set<string>;
}

export const TableRoot = ({ count }: { count?: number }) => {
  return (
    <>
      <div className="bg-muted-foreground/20 shadow-md shadow-black/35 group-aria-disabled:opacity-50 rounded p-1">
        {<TableIcon className="size-3.5" />}
      </div>
      <div className="gap-3 flex w-32 max-w-full items-center flex-shrink-0 group-aria-disabled:text-muted-foreground">
        <p className="w-20">Tables</p>
        {typeof count === "number" && count > 0 && (
          <p
            style={{ fontSize: "11px" }}
            className="min-w-6 text-center py-0.5 px-1 w-fit text-xs text-muted-foreground rounded bg-muted-foreground/5"
          >
            {count}
          </p>
        )}
      </div>
    </>
  );
};

export const ViewRoot = ({ count }: { count?: number }) => {
  return (
    <>
      <div className="bg-muted-foreground/20 group-aria-disabled:opacity-50 rounded p-1">
        {<EyeIcon className="size-3.5" />}
      </div>
      <div className="gap-3 flex w-32 max-w-full items-center flex-shrink-0 group-aria-disabled:text-muted-foreground">
        <p className="w-20">Views</p>
        {typeof count === "number" && count > 0 && (
          <p className="min-w-6 text-center py-1 px-1.5 w-fit text-xs text-muted-foreground rounded bg-muted-foreground/5">
            {count}
          </p>
        )}
      </div>
    </>
  );
};

export const FunctionsRoot = ({ count }: { count?: number }) => {
  return (
    <>
      <div className="bg-muted-foreground/20 group-aria-disabled:opacity-50 rounded p-1">
        {<FunctionSquare className="size-3.5" />}
      </div>
      <div className="gap-3 flex w-32 max-w-full items-center flex-shrink-0 group-aria-disabled:text-muted-foreground">
        <p className="w-20">Functions</p>
        {typeof count === "number" && count > 0 && (
          <p className="min-w-6 text-center py-1 px-1.5 w-fit text-xs text-muted-foreground rounded bg-muted-foreground/5">
            {count}
          </p>
        )}
      </div>
    </>
  );
};

const TreeNodeGroup = ({
  nodes,
  root,
  expandedNodes,
  selectedNode,
  filteredNodesMap,
  handleKeyDown,
  handleTreeItemClick,
}: {
  nodes: TNode[];
  root?: boolean;
  expandedNodes: Set<string>;
  selectedNode: TNode | null;
  filteredNodesMap: Map<string, FuseResult<TNode>> | undefined;
  handleKeyDown: (
    event: React.KeyboardEvent<HTMLLIElement>,
    node: TNode
  ) => void;
  handleTreeItemClick: (event: React.MouseEvent, node: TNode) => void;
}) => {
  const { createRef } = useFocusContext();
  return (
    <ul
      className="grid"
      role={root ? "tree" : "group"}
      aria-label={root ? "tree_root" : ""}
    >
      {nodes.map((node) => {
        const isExpanded = expandedNodes.has(node.id);
        const isSelected = selectedNode?.id === node.id;

        return (
          <SmallTooltip
            key={"st_" + node.id}
            description={`No items found here.`}
            disabled={root === false || root === undefined || node.isExpandable}
            asChild
          >
            <li
              id={node.id}
              key={"li_" + node.id}
              role="treeitem"
              aria-expanded={isExpanded}
              aria-selected={isSelected}
              // Do not change the tabIndex property.
              // It is critical to keep the focus on the tree item.
              tabIndex={node.tabIndex}
              onKeyDown={(event) => handleKeyDown(event, node)}
              onClick={(event) => handleTreeItemClick(event, node)}
              style={{ paddingLeft: node.parent ? 10 : 0, cursor: "pointer" }}
              className={cn("outline-none overflow-hidden relative")}
              ref={createRef("explorer", "node", { id: node.id })}
            >
              {/* Vertical line from parent */}
              {node.parent && (
                <div
                  className={cn("absolute left-4 top-0 bottom-0 border-l")}
                />
              )}
              {
                <TreeNode
                  node={node}
                  isExpanded={isExpanded}
                  matches={
                    filteredNodesMap
                      ? filteredNodesMap.get(node.id)?.matches
                      : undefined
                  }
                />
              }
              {node.isExpandable &&
                isExpanded &&
                node.children &&
                node.children.length > 0 && (
                  <TreeNodeGroup
                    nodes={node.children}
                    expandedNodes={expandedNodes}
                    selectedNode={selectedNode}
                    filteredNodesMap={filteredNodesMap}
                    handleKeyDown={handleKeyDown}
                    handleTreeItemClick={handleTreeItemClick}
                  />
                )}
            </li>
          </SmallTooltip>
        );
      })}
    </ul>
  );
};

const TreeNode = ({
  node,
  isExpanded,
  matches,
}: {
  node: TNode;
  isExpanded: boolean;
  matches: readonly FuseResultMatch[] | undefined;
}): JSX.Element => {
  const isFocused = useAppSelector(
    (state) => state.focus.currentFocus?.id === node.id
  );
  const logicalDelete = useAppSelector(
    (state) => state.schema.entities[node.id]?.logicalDelete
  );
  const className = cn(
    // mr-3 needed to avoid touching the scrollbar
    "mx-1 p-1 mr-3 py-0.5 my-0.5 flex flex-shrink-0 items-center gap-1.5 rounded-sm overflow-hidden text-muted-foreground",
    !isFocused && "hover:bg-neutral-800/80",
    isFocused && "bg-neutral-800/80 text-primary",
    logicalDelete && "hidden"
  );

  switch (node.type) {
    case BaseEntityType.Schema:
      return (
        <div className={className}>
          <ChevronRight
            className={cn(
              "size-3.5 flex-shrink-0 transition-all stroke-muted-foreground",
              isExpanded && "rotate-90"
            )}
          />
          {node.element}
        </div>
      );

    case BaseEntityType.View:
    case BaseEntityType.Table:
      return (
        <Table
          isExpanded={isExpanded}
          isFocused={isFocused}
          className={cn(className, "ml-2")}
          node={node}
          matches={matches}
        />
      );

    case BaseEntityType.Column:
      return (
        <Column
          isFocused={isFocused}
          className={cn(className, "ml-2")}
          node={node as unknown as SchemaColumn}
          matches={matches}
        />
      );

    case BaseEntityType.UserFunction:
      return (
        <Function
          isFocused={isFocused}
          className={cn(className, "ml-2")}
          node={node}
          matches={matches}
        />
      );
    default: {
      const disabled =
        node.isExpandable && node.children && node.children.length > 0;
      return (
        <div
          aria-disabled={disabled ? "false" : "true"}
          className={cn("aria-disabled:outline-muted", className, "group")}
        >
          {disabled ? (
            <ChevronRight
              className={cn(
                "size-3.5 flex-shrink-0 transition-all stroke-muted-foreground",
                isExpanded && "rotate-90",
                isFocused && "stroke-primary",
                "group-aria-disabled:stroke-muted"
              )}
            />
          ) : (
            <BorderSolidIcon
              className={cn(
                "size-3 stroke-1 flex-shrink-0 transition-all",
                "group-aria-disabled:stroke-muted"
              )}
            />
          )}
          {node.element}
        </div>
      );
    }
  }
};

const Tree = ({ expandedNodes: initExpandedNodes, items }: Props) => {
  const { createRef, setFocus } = useFocusContext();
  const explorer = useAppSelector((state) => state.explorer.enabled);
  const dispatch = useAppDispatch();
  const [searchValue, setSearchValue] = useState<string | undefined>();
  const {
    filteredNodes,
    treeNodes,
    selectedNode,
    expandedNodes,
    tablesNode,
    treeContainerRef,
    filterExpandedNodes,
    filteredNodesMap,
    handleKeyDown,
    handleTreeItemClick,
    setExpandedNodes,
    setSelectedNode,
  } = useTreeState(items, initExpandedNodes, searchValue);

  const handleOnChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      setSearchValue(e.target.value);
    },
    []
  );

  const handleOnInputFocusChange = useCallback(
    (id?: string) => {
      if (id === "ArrowDown" || id === "Enter") {
        setFocus("explorer", "node", {
          id: tablesNode?.id,
          from: "tree/handleOnInputFocusChange",
        });
        tablesNode?.ref.current?.focus();
      } else if (id === "ArrowUp") {
        setFocus("explorer", "button", {
          from: "tree/handleOnInputFocusChange",
        });
      }
    },
    [dispatch, setFocus, setSelectedNode, tablesNode]
  );

  const handleOnSearchFocus = useCallback(() => {
    setFocus("explorer", "search", {
      from: "explorer/tree/handleOnSearchFocus",
    });
  }, [setFocus]);

  const handleOnSearchClick = useCallback(
    () =>
      setFocus("explorer", "search", {
        from: "explorer/tree/handleOnSearchClick",
      }),
    [setFocus]
  );

  useEffect(() => {
    if (!explorer) {
      setSearchValue(undefined);
    }
  }, [explorer]);

  useEffect(() => {
    if (filterExpandedNodes) {
      setExpandedNodes(filterExpandedNodes);
    } else if (filterExpandedNodes === undefined) {
      setExpandedNodes(new Set());
    }
  }, [filterExpandedNodes]);

  return (
    <div className="relative h-full max-w-full flex flex-col overflow-hidden">
      <Search
        onClick={handleOnSearchClick}
        handleOnInputFocusChange={handleOnInputFocusChange}
        handleOnChange={handleOnChange}
        onFocus={handleOnSearchFocus}
        className="pl-0 max-w-52"
        size="sm"
        // onKeyDown={handleOnSearchKeyDown}
        ref={createRef("explorer", "search")}
        description="Search schema"
        shortcut={["⌘", "⇧", "F"]}
      />
      <ScrollArea ref={treeContainerRef}>
        <TreeNodeGroup
          root={true}
          nodes={(filteredNodes || treeNodes).filter((node) => !node.parent)}
          selectedNode={selectedNode}
          expandedNodes={expandedNodes}
          filteredNodesMap={filteredNodesMap}
          handleKeyDown={handleKeyDown}
          handleTreeItemClick={handleTreeItemClick}
        />
      </ScrollArea>
      <DeleteTreeNodeDialog />

      {/* Add stop propagation and prevent default. Otherwise the tree collapses down. */}
      <div className="mt-auto flex-shrink-0">
        <Navigation />
      </div>
    </div>
  );
};

export default Tree;

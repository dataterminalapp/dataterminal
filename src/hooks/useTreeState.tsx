import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
  createRef,
} from "react";
import { TreeNode } from "../components/sections/explorer/types";
import {
  FunctionsRoot,
  TableRoot,
  ViewRoot,
} from "../components/sections/explorer/tree";
import { useFuseSearch } from "./useFuseSearch";
import { useAppDispatch, useAppSelector } from "./useRedux";
import { FocusArea, FocusTarget, useFocusContext } from "@/contexts/focus";
import {
  BaseEntity,
  BaseEntityType,
  Schema,
  SchemaTable,
} from "@/features/schema";
import {
  preventDefaultAndStopPropagation,
  stopPropagation,
} from "@/components/utils";
import useCopyToClipboard from "./useCopyToClipboard";
import { searchOpenChanged } from "@/features/global";
import { handleOnBrowserShortcut } from "@/components/sections/explorer/node/table";
import { editor } from "monaco-sql-languages/esm/fillers/monaco-editor-core";

export const TABLES_NODE_ID = "tables_root";
export const VIEWS_NODE_ID = "views_root";
export const FUNCTIONS_NODE_ID = "functions_root";

const emptySchemaEntity: Schema = {
  type: BaseEntityType.Schema,
  name: "",
  id: "",
  children: null,
  tables: [],
  views: [],
  userFunctions: [],
  functions: [],
  procedures: [],
  extensions: [],
  database: "",
};

const buildRootNodes = (
  schema: Schema,
  registerRef: (
    area: FocusArea,
    target: FocusTarget,
    element: HTMLElement | editor.IStandaloneCodeEditor | null,
    options?: {
      autoFocus?: boolean;
      id?: string;
    }
  ) => void
) => {
  const tablesNodeRef = createRef<HTMLLIElement>();
  registerRef("explorer", "node", tablesNodeRef.current, {
    id: TABLES_NODE_ID,
  });
  const tablesNode: TreeNode = {
    parent: null,
    isExpandable: schema.tables.length > 0,
    tabIndex: -1,
    ref: tablesNodeRef,
    children: [],
    element: <TableRoot count={schema.tables.length} />,
    id: TABLES_NODE_ID,
    name: "Tables",
  };

  const viewsNodeRef = createRef<HTMLLIElement>();
  registerRef("explorer", "node", viewsNodeRef.current, {
    id: VIEWS_NODE_ID,
  });
  const viewsNode: TreeNode = {
    parent: null,
    isExpandable: schema.views.length > 0,
    tabIndex: -1,
    ref: viewsNodeRef,
    children: [],
    element: <ViewRoot count={schema.views.length} />,
    id: VIEWS_NODE_ID,
    name: "Views",
  };

  const functionsNodeRef = createRef<HTMLLIElement>();
  registerRef("explorer", "node", functionsNodeRef.current, {
    id: FUNCTIONS_NODE_ID,
  });
  const functionsNode: TreeNode = {
    parent: null,
    isExpandable: schema.userFunctions.length > 0,
    tabIndex: -1,
    ref: functionsNodeRef,
    children: [],
    element: <FunctionsRoot count={schema.userFunctions.length} />,
    id: FUNCTIONS_NODE_ID,
    name: "Functions",
  };

  return {
    tablesNode,
    viewsNode,
    functionsNode,
  };
};

/**
 * A custom hook that manages the state and behavior of a tree structure, including
 * node expansion, selection, keyboard navigation, and filtering. It provides utilities
 * for interacting with the tree, such as focusing nodes, handling keyboard events, and
 * toggling node expansion.
 *
 * I have been meaning to refactor this huge state for a long time.
 *
 * @returns An object containing the following properties and methods:
 * - `flatTreeNodes`: A flattened array of all tree nodes.
 * - `filteredNodes`: The filtered tree nodes based on the search value.
 * - `treeNodes`: The hierarchical tree nodes.
 * - `selectedNode`: The currently selected tree node, or `null` if none is selected.
 * - `expandedNodes`: A set of IDs of the currently expanded nodes.
 * - `treeContainerRef`: A `ref` to the tree container element.
 * - `tablesNode`: The root node for tables, or `null` if not initialized.
 * - `filteredNodesMap`: A map of filtered nodes for quick lookup.
 * - `filterExpandedNodes`: A set of expanded nodes in the filtered tree.
 * - `handleKeyDown`: A callback to handle keyboard events for tree navigation.
 * - `handleTreeItemClick`: A callback to handle mouse click events on tree items.
 * - `focusNode`: A function to focus a specific tree node.
 * - `toggleNodeExpansion`: A function to toggle the expansion state of a tree node.
 * - `setExpandedNodes`: A function to manually set the expanded nodes.
 * - `setSelectedNode`: A function to manually set the selected node.
 *
 */
export const useTreeState = (
  items: BaseEntity[],
  initExpandedNodes?: Set<string>,
  searchValue?: string
) => {
  const currentConnectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );
  const connection = useAppSelector(
    (state) =>
      currentConnectionId && state.connections.entities[currentConnectionId]
  );
  const dispatch = useAppDispatch();
  const { register, setFocus } = useFocusContext();
  const [, copy] = useCopyToClipboard();
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [flatTreeNodes, setFlatTreeNodes] = useState<TreeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    initExpandedNodes || new Set()
  );
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const [tablesNode, setTablesNode] = useState<TreeNode | null>(null);
  const {
    filteredNodes,
    filteredNodesMap,
    expandedNodes: filterExpandedNodes,
  } = useFuseSearch(treeNodes, flatTreeNodes, searchValue);

  // Handle blur
  useEffect(() => {
    const handleBlur = (event: FocusEvent) => {
      // Check if the newly focused element is outside the tree
      if (
        treeContainerRef.current &&
        !treeContainerRef.current.contains(event.relatedTarget as Node)
      ) {
        setSelectedNode(null);
      }
    };

    const treeContainer = treeContainerRef.current;
    if (treeContainer) {
      treeContainer.addEventListener("focusout", handleBlur);
    }

    return () => {
      if (treeContainer) {
        treeContainer.removeEventListener("focusout", handleBlur);
      }
    };
  }, []);

  // Initialize tree nodes and state
  useEffect(() => {
    const fuseNodes: Array<TreeNode> = [];
    const initializeRootNode = (schema: Schema): TreeNode[] => {
      const { functionsNode, tablesNode, viewsNode } = buildRootNodes(
        schema,
        register
      );

      setTablesNode(tablesNode);

      return [
        {
          ...tablesNode,
          children: initializeTreeNodes(schema.tables, tablesNode) || [],
        },
        {
          ...viewsNode,
          children: initializeTreeNodes(schema.views, viewsNode) || [],
        },
        {
          ...functionsNode,
          children:
            initializeTreeNodes(schema.userFunctions, functionsNode) || [],
        },
      ];
    };
    const initializeTreeNodes = (
      items: BaseEntity[],
      parent: TreeNode
    ): TreeNode[] => {
      return items.map((item) => {
        const hasChildren =
          Array.isArray(item.children) && item.children.length > 0;
        const node: TreeNode = {
          ...item,
          parent,
          isExpandable: hasChildren,
          tabIndex: -1,
          ref: createRef(),
          children: [],
          logicalDelete: item.logicalDelete,
          element: <></>,
        };

        const children = hasChildren
          ? initializeTreeNodes(item.children!, node)
          : [];

        const finalNode = { ...node, children };
        fuseNodes.push(finalNode);

        return finalNode;
      });
    };

    const schema = items[0] as Schema | undefined;
    const nodes = initializeRootNode(schema || emptySchemaEntity);
    if (nodes.length > 0) {
      nodes[0].tabIndex = 0;
    }
    setTreeNodes(nodes);
    setFlatTreeNodes(fuseNodes);
  }, [items]);

  // TODO: Improve this
  const flattenTree = (nodes: TreeNode[]): TreeNode[] => {
    let flatList: TreeNode[] = [];
    nodes.forEach((node) => {
      if (node.parent === null || expandedNodes.has(node.parent.id)) {
        flatList.push(node);
        if (node.isExpandable && expandedNodes.has(node.id) && node.children) {
          flatList = flatList.concat(flattenTree(node.children));
        }
      }
    });
    return flatList;
  };

  const focusNode = (node: TreeNode) => {
    setFocus("explorer", "node", { id: node.id, from: "treeState/focusNode" });
  };

  // TODO: Improve this.
  const focusNextNode = (currentNode: TreeNode) => {
    const flatNodes = flattenTree(filteredNodes || treeNodes);
    const currentIndex = flatNodes.findIndex((n) => n.id === currentNode.id);
    if (currentIndex < flatNodes.length - 1) {
      focusNode(flatNodes[currentIndex + 1]);
    }
  };

  // TODO: Improve this.
  const focusPreviousNode = (currentNode: TreeNode) => {
    const flatNodes = flattenTree(filteredNodes || treeNodes);
    const currentIndex = flatNodes.findIndex((n) => n.id === currentNode.id);
    if (currentIndex > 0) {
      focusNode(flatNodes[currentIndex - 1]);
    }
  };

  // TODO: Improve this.
  const focusFirstNode = () => {
    const flatNodes = flattenTree(filteredNodes || treeNodes);
    if (flatNodes.length > 0) {
      focusNode(flatNodes[0]);
    }
  };

  // TODO: Improve this
  const focusLastNode = () => {
    const flatNodes = flattenTree(filteredNodes || treeNodes);
    if (flatNodes.length > 0) {
      focusNode(flatNodes[flatNodes.length - 1]);
    }
  };

  // TODO: Improve this
  const focusNodeByChar = (char: string, currentNode: TreeNode) => {
    const flatNodes = flattenTree(filteredNodes || treeNodes);
    const startIndex = flatNodes.findIndex((n) => n.id === currentNode.id) + 1;
    const matchNode = flatNodes
      .slice(startIndex)
      .concat(flatNodes.slice(0, startIndex))
      .find((n) => n.name.toLowerCase().startsWith(char.toLowerCase()));
    if (matchNode) {
      focusNode(matchNode);
    }
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>, node: TreeNode) => {
      const { key, metaKey, ctrlKey } = event;

      const keysToPrevent = [
        "ArrowDown",
        "ArrowUp",
        "ArrowRight",
        "ArrowLeft",
        " ",
        "Home",
        "End",
      ];

      if (
        keysToPrevent.includes(key) ||
        (key === "c" && (metaKey || ctrlKey)) ||
        (key === "k" && metaKey) ||
        (key === "f" && metaKey)
      ) {
        preventDefaultAndStopPropagation(event);
      }

      switch (key) {
        case "ArrowDown":
          focusNextNode(node);
          break;
        case "ArrowUp":
          if (node.id === TABLES_NODE_ID) {
            setFocus("explorer", "search", { from: "treeState/ArrowUp" });
            setSelectedNode(null);
            return;
          }
          focusPreviousNode(node);
          break;
        case "ArrowRight":
          if (node.isExpandable) {
            if (expandedNodes.has(node.id)) {
              focusNextNode(node);
            } else {
              toggleNodeExpansion(node, true);
            }
          }
          break;
        case "ArrowLeft":
          if (node.isExpandable && expandedNodes.has(node.id)) {
            toggleNodeExpansion(node, false);
          } else if (node.parent) {
            focusNode(node.parent);
          }
          break;
        case "a":
          focusNodeByChar(key, node);
          break;
        case "Enter":
          if (
            metaKey &&
            (node.type === BaseEntityType.Table ||
              node.type === BaseEntityType.View)
          ) {
            preventDefaultAndStopPropagation(event);
            if (connection) {
              handleOnBrowserShortcut(
                dispatch,
                connection,
                node as unknown as SchemaTable
              );
            } else {
              console.warn(
                "Connection ID is not present to open a browser tab."
              );
            }
          }
          break;
        case " ":
        case "Space":
          if (node.isExpandable) {
            toggleNodeExpansion(node, !expandedNodes.has(node.id));
          }
          break;
        case "Home":
          focusFirstNode();
          break;
        case "End":
          focusLastNode();
          break;
        case "f":
        case "k":
          if (metaKey) {
            setFocus("explorer", "search", { from: "treeState/k" });
            return;
          } else {
            focusNodeByChar(key, node);
          }
          break;
        case "m":
          if (metaKey) {
            return;
          }
          focusNodeByChar(key, node);
          break;
        case "e":
          focusNodeByChar(key, node);
          break;
        case "p":
          if (metaKey) {
            dispatch(searchOpenChanged(true));
            return;
          } else {
            focusNodeByChar(key, node);
          }
          break;
        case "c":
          if (metaKey || ctrlKey) {
            copy(node.name);
            return;
          } else {
            focusNodeByChar(key, node);
          }
          break;
        case "w":
          if (metaKey) {
            return;
          } else {
            focusNodeByChar(key, node);
          }
          break;
        default:
          if (key.length === 1) {
            focusNodeByChar(key, node);
          }
          break;
      }
    },
    [
      treeNodes,
      expandedNodes,
      selectedNode,
      currentConnectionId,
      dispatch,
      focusPreviousNode,
      focusNextNode,
      copy,
    ]
  );

  const handleTreeItemClick = useCallback(
    (event: React.MouseEvent, node: TreeNode) => {
      stopPropagation(event);
      focusNode(node);

      if (node.isExpandable) {
        toggleNodeExpansion(node, !expandedNodes.has(node.id));
      }
    },
    [selectedNode, expandedNodes, focusNode]
  );

  //   TODO: Replace with a set for more performance.
  const toggleNodeExpansion = useCallback((node: TreeNode, expand: boolean) => {
    setExpandedNodes((prevExpandedNodes) => {
      const newExpandedNodes = new Set(prevExpandedNodes);
      if (expand) {
        newExpandedNodes.add(node.id);
      } else {
        newExpandedNodes.delete(node.id);
      }
      return newExpandedNodes;
    });
  }, []);

  return {
    flatTreeNodes,
    filteredNodes,
    treeNodes,
    selectedNode,
    expandedNodes,
    treeContainerRef,
    tablesNode,
    filteredNodesMap,
    filterExpandedNodes,
    handleKeyDown,
    handleTreeItemClick,
    focusNode,
    toggleNodeExpansion,
    setExpandedNodes,
    setSelectedNode,
  };
};

import { TreeNode } from "@/components/sections/explorer/types";
import Fuse, { IFuseOptions, FuseResult } from "fuse.js";
import { useState, useEffect, useMemo } from "react";
import {
  FUNCTIONS_NODE_ID,
  TABLES_NODE_ID,
  VIEWS_NODE_ID,
} from "./useTreeState";

function rebuildChildren(
  children: Array<TreeNode>,
  filteredNodesSet: Set<string>
) {
  const newChildren: Array<TreeNode> = [];
  children.forEach((tableOrView) => {
    if (filteredNodesSet.has(tableOrView.id)) {
      newChildren.push(tableOrView);
    } else {
      if (tableOrView.children) {
        const filteredChildren = tableOrView.children.filter((x) =>
          filteredNodesSet.has(x.id)
        );
        if (filteredChildren.length > 0) {
          const newTableOrView = {
            ...tableOrView,
            children: filteredChildren,
          };
          newChildren.push(newTableOrView);
        }
      }
    }
  });

  return newChildren;
}

/**
 * Fuse search implementation for the explorer tree structure.
 */
export const useFuseSearch = (
  nodes: TreeNode[],
  flatNodes: TreeNode[],
  filter: string | undefined
) => {
  const [fuse, setFuse] = useState<Fuse<TreeNode> | null>(null);

  useEffect(() => {
    if (flatNodes.length > 0) {
      const options: IFuseOptions<TreeNode> = {
        keys: ["name"],
        threshold: 0.4,
        includeMatches: true,
      };
      setFuse(new Fuse(flatNodes, options));
    }
  }, [flatNodes]);

  const {
    filteredNodes,
    filteredNodesMap,
    expandedNodes,
  }: {
    filteredNodes: Array<TreeNode> | undefined;
    filteredNodesMap: Map<string, FuseResult<TreeNode>> | undefined;
    expandedNodes: Set<string> | undefined;
  } = useMemo(() => {
    if (fuse && filter) {
      const expandedNodes = new Set<string>();
      const searchNodes = fuse.search(filter);
      const filteredNodesSet = new Set<string>();
      const filteredNodesMap = new Map<string, FuseResult<TreeNode>>();
      searchNodes.forEach((x) => {
        if (x.item.parent) {
          expandedNodes.add(x.item.parent.id);

          // Columns opening the table/view root node.
          if (x.item.parent.parent) {
            expandedNodes.add(x.item.parent.parent.id);
          }
        }

        filteredNodesMap.set(x.item.id, x);
        filteredNodesSet.add(x.item.id);
      });
      const filteredNodes: Array<TreeNode> = [];

      nodes.forEach((node) => {
        // Add the roots.
        if (
          node.id === TABLES_NODE_ID ||
          node.id === VIEWS_NODE_ID ||
          node.id === FUNCTIONS_NODE_ID
        ) {
          const newNode = {
            ...node,
          };
          if (newNode.children) {
            newNode.children = rebuildChildren(
              newNode.children,
              filteredNodesSet
            );
            filteredNodes.push(newNode);
          }
        }
      });

      return { filteredNodes, filteredNodesMap, expandedNodes };
    } else {
      return {
        filteredNodes: undefined,
        filteredNodesMap: undefined,
        expandedNodes: undefined,
      };
    }
  }, [fuse, filter]);

  return { filteredNodes, filteredNodesMap, expandedNodes };
};

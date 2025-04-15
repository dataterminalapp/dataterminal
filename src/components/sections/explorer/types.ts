import { BaseEntity, BaseEntityType } from "@/features/schema";

export interface TreeItem {
  id: string;
  name: string;
  children?: TreeItem[];
}

export interface TreeNode extends TreeItem {
  parent: TreeNode | null;
  isExpandable: boolean;
  tabIndex: number;
  ref: React.RefObject<HTMLLIElement>;
  type?: BaseEntityType;
  logicalDelete?: boolean;
  element: JSX.Element;
  children?: TreeNode[];
}

export interface Props {
  items: BaseEntity[];
  expandedNodes?: Set<string>;
  filter?: string;
}

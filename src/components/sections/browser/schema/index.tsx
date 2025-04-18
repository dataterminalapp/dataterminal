import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useTabContext } from "@/contexts/tab";
import { BaseEntityType, SchemaTable, SchemaView } from "@/features/schema";
import { useCallback } from "react";
import { tabBrowserOptionsChanges } from "@/features/tabs";
import { Eye, Table } from "lucide-react";
import { cn } from "@/lib/utils";

const SchemaGrid = ({
  className,
  title,
  items,
  icon,
  onClick,
}: {
  className?: string;
  title: string;
  items: Array<SchemaTable | SchemaView>;
  icon: "table" | "view";
  onClick: (item: SchemaTable | SchemaView) => void;
}) => (
  <div className={className}>
    <h1 className="text-lg font-semibold mb-4">{title}</h1>
    {items.length === 0 && (
      <p className="text-muted-foreground">
        No {title.toLocaleLowerCase()} available.
      </p>
    )}
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {items.map((item) => (
        <div
          key={item.name}
          className="bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors duration-200 p-4 rounded-lg cursor-pointer"
          onClick={() => onClick(item)}
        >
          <div className="mb-2">
            <div className="relative overflow-hidden bg-zinc-700/75 w-full aspect-square rounded-md flex items-center justify-center">
              <div className="text-xl font-extrabold">
                {item.name.substring(0, 3).toUpperCase()}
              </div>
              <div className="absolute opacity-5">
                {icon === "table" ? (
                  <Table className="size-64 stroke-1 opacity-50" />
                ) : (
                  <Eye className="size-64 stroke-1 opacity-50" />
                )}
              </div>
            </div>
          </div>
          <h3 className="text-sm font-medium truncate">{item.name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {item.children?.length || 0}{" "}
            {item.children?.length === 1 ? "column" : "columns"}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const SchemaBrowser = ({ className }: { className?: string }) => {
  const { id: tabId } = useTabContext();
  const dispatch = useAppDispatch();
  const tab = useAppSelector((state) => state.tabs.entities[tabId]);
  const entity = tab.options.browser?.entity;

  const onClick = useCallback(
    (entity: SchemaTable | SchemaView) => {
      dispatch(
        tabBrowserOptionsChanges({
          tabId,
          schemaEntity: entity,
        })
      );
    },
    [dispatch, tabId]
  );

  if (entity?.type !== BaseEntityType.Schema) {
    return <>Invalid entity</>;
  }

  return (
    <div className={cn(className, "divide-y")}>
      <SchemaGrid
        title="Tables"
        items={entity.tables}
        icon="table"
        onClick={onClick}
        className="pb-8"
      />
      <SchemaGrid
        title="Views"
        items={entity.views}
        icon="view"
        onClick={onClick}
        className="pb-4 pt-6"
      />
    </div>
  );
};

export default SchemaBrowser;

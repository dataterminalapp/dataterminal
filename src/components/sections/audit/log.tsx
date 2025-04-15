import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import { ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useAppSelector } from "@/hooks/useRedux";

type AuditAction = "Insert" | "Update" | "Delete";

interface AuditLogItem {
  action: AuditAction;
  entity: string;
  change: string;
}

const Item = ({ item }: { item: AuditLogItem }) => {
  const { action, entity, change } = item;

  return (
    <div className="flex items-center gap-2">
      <Collapsible>
        <CollapsibleTrigger className="flex flex-row items-center gap-2">
          <ChevronRightIcon />
          <ChevronDownIcon />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="flex items-center gap-2">
            <div>{action}</div>
            <div>{entity}</div>
            <div>{change}</div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const Log = ({ resultId }: { resultId: string }) => {
  const { data } = useAppSelector((state) => state.results.entities[resultId]);
  return (
    <div>
      <div>Search</div>
      <div>Start</div>
      <div>
        {data?.rows.map((result, index) => (
          <Item
            key={resultId + "_log_" + String(index)}
            item={result as unknown as AuditLogItem}
          />
        ))}
      </div>
      <div>End</div>
      <div>Navigation</div>
    </div>
  );
};

export default Log;

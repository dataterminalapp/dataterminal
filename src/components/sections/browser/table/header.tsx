import { useState } from "react";
import { TableIcon } from "@radix-ui/react-icons";
import { BaseEntityType } from "@/features/schema";
import { cn } from "@/lib/utils";
import SmallTooltip from "@/components/utils/SmallTooltip";
import { useAppSelector } from "@/hooks/useRedux";
import { Button } from "@/components/ui/button";
import { useTabContext } from "@/contexts/tab";
import Dialog from "./dialog";
import { EyeIcon } from "lucide-react";
import { useBrowserContext } from "@/contexts/browser";

const CONNECTION_MISMATCH_MESSAGE =
  "The current connection does not match the table connection";

const Header = ({
  resultId,
  isConnectionDeleted,
}: {
  resultId: string;
  isConnectionDeleted: boolean;
}) => {
  /**
   * Tabs and connection
   */
  const { id: tabId } = useTabContext();
  const { gridSelection } = useBrowserContext();

  /**
   * States
   */
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  /**
   * Selectors
   */
  const tab = useAppSelector((state) => state.tabs.entities[tabId]);
  const rows = useAppSelector(
    (state) => state.results.entities[resultId]?.data?.rows
  );
  const currentConnectionId = useAppSelector(
    (state) => state.workspace.connection.current
  );

  /**
   * Variables
   */
  const entity = tab.options.browser?.entity;
  const connection = tab.options.browser?.connection;
  const isConnectionUnselected = currentConnectionId !== connection?.id;
  const rowSelectionLength = gridSelection?.rows.length;
  const allRowsSelected = rowSelectionLength === rows?.length;

  return (
    <div className="flex flex-row items-center justify-between mt-2">
      <h1
        className={cn(
          "flex flex-row gap-2 items-center text-lg font-medium",
          isConnectionDeleted && "text-muted-foreground"
        )}
      >
        {entity && (
          <div className="p-1.5 mr-2 rounded text-muted-foreground bg-zinc-800 shrink-0 border border-zinc-700">
            {entity.type === BaseEntityType.Table ? (
              <TableIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </div>
        )}
        {entity?.name}
      </h1>

      <div className="flex flex-row gap-2">
        {/* Delete rows button */}
        <SmallTooltip
          description={
            isConnectionUnselected
              ? CONNECTION_MISMATCH_MESSAGE
              : "Delete selected rows"
          }
          className={cn(
            rowSelectionLength && "visible",
            !rowSelectionLength && "invisible",
            "ml-auto py-1"
          )}
          shortcut={isConnectionUnselected ? undefined : ["⌘", "←"]}
        >
          <Button
            variant={"destructive"}
            onClick={() => setOpenDeleteDialog(true)}
            disabled={isConnectionUnselected}
          >
            {allRowsSelected
              ? "Truncates table"
              : `Delete ${rowSelectionLength} ${
                  rowSelectionLength && rowSelectionLength <= 1 ? "row" : "rows"
                }`}
          </Button>
        </SmallTooltip>
      </div>

      {/* Dialog to delete rows */}
      {entity && entity.type === BaseEntityType.Table && openDeleteDialog && (
        <Dialog
          allRowsSelected={allRowsSelected}
          entity={entity}
          resultId={resultId}
          open={openDeleteDialog}
          onOpenChanged={(o) => setOpenDeleteDialog(o)}
        />
      )}
    </div>
  );
};

export default Header;

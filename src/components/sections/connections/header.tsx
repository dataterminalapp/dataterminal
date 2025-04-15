import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { useTabContext } from "@/contexts/tab";
import { tabConnectionCreationStarted } from "@/features/tabs";
import { Button } from "../../ui/button";
import DetectBoardKey from "../../utils/shortcuts/detectBoardKey";
import { useCallback } from "react";
import { useFocusContext } from "@/contexts/focus";
import SmallTooltip from "../../utils/SmallTooltip";
import { preventDefault } from "../../utils";
import { buildFocusRefId } from "./manage";
import { cn } from "@/lib/utils";

interface AddConnectionButtonProps {
  onAddConnectionClick: () => void;
}

const AddConnectionButton = ({
  onAddConnectionClick,
}: AddConnectionButtonProps) => {
  /**
   * Contexts
   */
  const { id: tabId } = useTabContext();
  const { createRef, setFocus } = useFocusContext();

  /**
   * Selectors
   */
  const connectionIds = useAppSelector((state) => state.connections.ids);

  const firstConnectionId = connectionIds[0]
    ? buildFocusRefId(connectionIds[0], tabId)
    : undefined;

  const handleAddButtonKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        preventDefault(event);
        setFocus("connection", "row", {
          id: firstConnectionId,
          from: "conneciton/manage/handleAddButtonKeyDown",
        });
      }
    },
    [setFocus, firstConnectionId]
  );

  return (
    <>
      <SmallTooltip
        asChild
        description={"Add a new connection"}
        shortcut={["A"]}
        disableHoverableContent={false}
      >
        <Button
          onClick={onAddConnectionClick}
          onKeyDown={handleAddButtonKeyDown}
          ref={createRef("connection", "button")}
          variant={"primary"}
        >
          Connect Postgres
        </Button>
      </SmallTooltip>
    </>
  );
};

const Header = ({ className }: { className?: string }) => {
  /**
   * Contexts
   */
  const dispatch = useAppDispatch();
  const { id: tabId } = useTabContext();

  /**
   * Selectors
   */
  const isAddingConnection = useAppSelector(
    (state) =>
      state.tabs.entities[tabId]?.options.connection?.isAddingConnection
  );
  const explorerFocus = useAppSelector(
    (state) => state.focus.currentFocus?.area === "explorer"
  );

  /**
   * Callbacks
   */
  const onAddConnectionClick = useCallback(() => {
    dispatch(tabConnectionCreationStarted({ id: tabId }));
  }, [tabId]);

  return (
    <>
      <div className={cn("flex-none", className)}>
        <div className="mx-auto">
          <div className="flex flex-row justify-between items-center gap-6">
            <h1 className="text-3xl flex-shrink font-bold">
              {isAddingConnection ? "Connect Postgres" : "Connections"}
            </h1>
            {!isAddingConnection && (
              <AddConnectionButton
                onAddConnectionClick={onAddConnectionClick}
              />
            )}

            {!isAddingConnection && !explorerFocus && (
              <>
                <DetectBoardKey
                  stopPropagation
                  preventDefault
                  boardKey={"a"}
                  onKeyPress={onAddConnectionClick}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;

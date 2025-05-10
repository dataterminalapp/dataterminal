import DetectBoardKey from "@/components/utils/shortcuts/detectBoardKey";
import { useBrowserContext } from "@/contexts/browser";
import { useFocusContext } from "@/contexts/focus";
import { searchFilterEnabled } from "@/features/result";
import { useAppDispatch } from "@/hooks/useRedux";

const Shortcuts = ({
  resultId,
  onOpenDeleteDialogChanged,
}: {
  resultId: string;
  onOpenDeleteDialogChanged: (o: boolean) => void;
}) => {
  const dispatch = useAppDispatch();
  const { setFocus, nextTablePage, previousTablePage, getCurrentFocus } =
    useFocusContext();
  const { gridSelection } = useBrowserContext();

  return (
    <>
      <DetectBoardKey
        meta
        boardKey="f"
        onKeyPress={() => {
          setFocus("result", "search", {
            from: "explore/detectBoardKey",
            id: resultId,
          });
          dispatch(searchFilterEnabled({ id: resultId }));
        }}
      />
      <DetectBoardKey
        meta
        boardKey="n"
        onKeyPress={() =>
          setFocus("result", "pagination", {
            id: resultId,
            from: "table/focusedPaginationInput",
          })
        }
      />
      <DetectBoardKey
        boardKey="Backspace"
        meta
        onKeyPress={() =>
          getCurrentFocus()?.target !== "search" &&
          (gridSelection?.rows.length || 0) > 0 &&
          onOpenDeleteDialogChanged(true)
        }
      />

      <DetectBoardKey boardKey="." onKeyPress={() => nextTablePage()} />
      <DetectBoardKey
        meta
        boardKey=","
        onKeyPress={() => previousTablePage()}
      />
    </>
  );
};

export default Shortcuts;

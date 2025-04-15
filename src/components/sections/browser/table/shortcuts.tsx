import DetectBoardKey from "@/components/utils/shortcuts/detectBoardKey";
import { useFocusContext } from "@/contexts/focus";
import { searchFilterEnabled } from "@/features/result";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";

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
  const rowSelection = useAppSelector(
    (state) => state.results.entities[resultId]?.uiState.rowSelection
  );
  const rowsSelected = rowSelection ? Object.keys(rowSelection).length : 0;

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
          rowsSelected > 0 &&
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

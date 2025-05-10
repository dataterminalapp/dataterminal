import { useCallback, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import DetectBoardKey from "../utils/shortcuts/detectBoardKey";
import { stopPropagation } from ".";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import { ChevronsUpDown } from "lucide-react";
import { useFocusContext } from "@/contexts/focus";

interface Props {
  options: {
    description?: string;
    object?: string;
    title?: string;
  };
  open: boolean;
  code?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onOpenChange?: (open: boolean) => void;
  onCloseAutoFocus: () => void;
}

const CodeDisplay = ({ code }: { code: string }) => {
  const [highlight, copy] = useCopyToClipboard();

  const onCopyClick = useCallback(() => {
    if (code) {
      copy(code);
    }
  }, [copy, code]);

  return (
    <div className="group relative">
      <button
        onClick={onCopyClick}
        className="bg-pane hover:bg-muted-foreground/20 group-hover:visible invisible absolute z-50 rounded p-1 right-2 top-1.5"
      >
        {highlight ? (
          <CheckIcon className="stroke-green-500" />
        ) : (
          <CopyIcon className="text-muted-foreground" />
        )}
      </button>
      <pre className="border rounded p-2 overflow-auto text-muted-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const DeleteDialog = (props: Props) => {
  const [displayCode, setDisplayCode] = useState(false);
  const { setFocus, createRef } = useFocusContext();

  return (
    <AlertDialog onOpenChange={props.onOpenChange} open={props.open}>
      <AlertDialogContent
        onOpenAutoFocus={() => setFocus("dialog", "button", { id: "no" })}
        onCloseAutoFocus={props.onCloseAutoFocus}
        className="bg-panel"
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
      >
        <AlertDialogHeader className="overflow-hidden">
          <AlertDialogTitle>
            {props.options.title
              ? props.options.title
              : "Are you sure you want to delete this?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-wrap truncate">
            {props.options.description}
          </AlertDialogDescription>
          {props.options.object && (
            <p className="text-wrap text-muted-foreground truncate bg-zinc-800 text-sm px-2 py-1 rounded-md">
              {props.options.object}
            </p>
          )}

          {props.code && displayCode && <CodeDisplay code={props.code} />}
        </AlertDialogHeader>
        <AlertDialogFooter className="items-center">
          {props.code && (
            <Button
              className="flex flex-row items-center font-light gap-1 mr-auto text-muted-foreground/50 bg-none stroke-muted-foreground/50 hover:stroke-primary hover:bg-muted-foreground/10"
              onClick={() => setDisplayCode((state) => !state)}
              variant={"ghost"}
            >
              <ChevronsUpDown className="shrink-0 size-3.5 stroke-inherit" />
              Show code
            </Button>
          )}
          <AlertDialogCancel
            ref={createRef("dialog", "button", { id: "no" })}
            className="bg-panel"
            onClick={props.onCancel}
          >
            No
          </AlertDialogCancel>
          <AlertDialogAction
            ref={createRef("dialog", "button", { id: "yes" })}
            onClick={props.onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-destructive"
          >
            Yes
          </AlertDialogAction>
          <DetectBoardKey boardKey="y" onKeyPress={props.onConfirm} />
          <DetectBoardKey boardKey="n" onKeyPress={props.onCancel} />
          <DetectBoardKey boardKey="Escape" onKeyPress={props.onCancel} />
          <DetectBoardKey
            boardKey="ArrowLeft"
            onKeyPress={() => setFocus("dialog", "button", { id: "no" })}
          />
          <DetectBoardKey
            boardKey="ArrowRight"
            onKeyPress={() => setFocus("dialog", "button", { id: "yes" })}
          />
          <DetectBoardKey
            boardKey="ArrowUp"
            onKeyPress={() => setFocus("dialog", "button", { id: "yes" })}
          />
          <DetectBoardKey
            boardKey="ArrowDown"
            onKeyPress={() => setFocus("dialog", "button", { id: "no" })}
          />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteDialog;

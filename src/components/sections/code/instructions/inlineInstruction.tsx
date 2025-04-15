import {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  createRef,
  useState,
  useCallback,
} from "react";
import { createRoot, Root } from "react-dom/client";
import * as monaco from "monaco-editor";
import { Button } from "../../../ui/button";
import BoardKey from "../../../utils/shortcuts/boardKey";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { APIResponse } from "@/services/types";
import { APIError, APIErrorJSON } from "../../../../services/error";
import { ToasterToast } from "@/hooks/useToast";
import EditorDiffManager from "./editorDiffManager";
import TipTapEditor from "./editor";
import { Editor } from "@tiptap/react";
import { Provider } from "react-redux";
import { store } from "../../../../store";
import { useAppDispatch, useAppSelector } from "@/hooks/useRedux";
import { PanelProvider, usePanelContext } from "@/contexts/panel";
import { extractTextFromTiptapJSON } from "./mention/utils";
import { stopPropagation } from "@/components/utils";
import { requiresAuthDialogOpened } from "@/features/global";

interface InlineCommandProps {
  editor: monaco.editor.IStandaloneCodeEditor;
  className?: string;
  onSubmit: () => void;
  onCancel: () => void;
  onHeightChange?: (height: number) => void;
  onError: (error: APIErrorJSON) => void;
}

const Loading = () => {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev === "." ? ".." : prev === ".." ? "..." : "."));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return <p className="w-4">{dots}</p>;
};

export const InlineCommand = forwardRef<Editor, InlineCommandProps>(
  (
    {
      editor,
      className,
      onHeightChange,
      onCancel,
      onSubmit: onSuccessfulSubmit,
      onError,
    },
    ref
  ) => {
    /**
     * Providers
     */
    const { id: panelId } = usePanelContext();
    const dispatch = useAppDispatch();

    /**
     * Selectors
     */
    const currentSchemaName = useAppSelector(
      (state) => state.workspace.schema.current
    );
    const layout = useAppSelector(
      (state) => state.panels.entities[panelId].layout
    );
    const auth = useAppSelector((state) => state.global.auth);
    const schema = useAppSelector((state) =>
      currentSchemaName
        ? state.schema.schemas.entities[currentSchemaName]
        : undefined
    );

    /**
     * We use a ref for instructions rather than a state,
     * because otherwise the editor handlers will have an old acces to an old variable.
     * As they don't re-trigger an update in the editor when they change.
     */
    const [instructions, setInstructions] = useState<Array<string>>([]);
    const [loading, setLoading] = useState(false);

    /**
     * Refs
     */
    const instructionsRef = useRef<Array<string>>([]);
    const editorRef = useRef<Editor>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const originalContentRef = useRef<string>(editor.getValue());
    const cancelRef = useRef<boolean>(false);
    const editorDiffManagerRef = useRef<EditorDiffManager | null>(
      new EditorDiffManager(editor)
    );

    useImperativeHandle(ref, () => editorRef.current!);

    /**
     * Callbacks
     */
    const updateContainerHeight = useCallback(() => {
      if (containerRef.current && onHeightChange) {
        onHeightChange(containerRef.current.offsetHeight);
      }
    }, [onHeightChange]);

    const handleAccept = useCallback(() => {
      console.log("Accepting");
      editorDiffManagerRef.current?.acceptChanges();
      onSuccessfulSubmit();
    }, [onSuccessfulSubmit]);

    const handleSubmit = useCallback(async () => {
      console.log("Submiting");
      try {
        if (!editorRef.current) return;
        if (!auth) {
          dispatch(
            requiresAuthDialogOpened({
              description:
                "Using AI instructions requires to be authenticated.",
            })
          );
          return;
        }

        const { mentions, text } = extractTextFromTiptapJSON(
          editorRef.current.getJSON()
        );
        if (!text || !schema) return;
        setLoading(true);

        const { data, error }: APIResponse<string, APIErrorJSON> = await (
          window as Window
        ).electronAPI.generateCode(text, editor.getValue(), schema, mentions);

        if (cancelRef.current) {
          return;
        }

        if (data) {
          const { code } = JSON.parse(data);
          const model = editor.getModel();
          if (model) {
            editorDiffManagerRef.current?.applyCodeDiff(code);

            // model.pushEditOperations(
            //   [], // Preserve cursor
            //   [
            //     {
            //       range: model.getFullModelRange(),
            //       text: code,
            //     },
            //   ],
            //   () => null // Return null to preserve cursor
            // );
          }

          const newInstructions = [...instructionsRef.current, text];

          instructionsRef.current = newInstructions;
          setInstructions(newInstructions);
        } else if (error) {
          console.error("Internal error generating code: ", error);
          onError(error);
        }
      } catch (err) {
        console.error("Error fetching from API: ", err);
        onError(
          APIError.normalizeError(
            err,
            "Unable to process request right now"
          ).toJSON()
        );
      }

      setLoading(false);
    }, [auth]);

    const handleCancel = useCallback(() => {
      cancelRef.current = true;
      editorDiffManagerRef.current?.cancelChanges();
      onCancel();
    }, [onCancel]);

    const handleEnter = useCallback(() => {
      console.log("Handle enter");
      if (loading) {
        return;
      }

      if (instructionsRef.current.length === 0) {
        handleSubmit();
      } else {
        handleAccept();
      }
    }, [handleSubmit, handleAccept]);

    /**
     * Effects
     */
    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.commands.focus();
      }
      originalContentRef.current = editor.getValue();
    }, [editor]);

    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.commands.focus();
      }
    }, []);

    useEffect(() => {
      if (editorRef.current) {
        editorRef.current.commands.focus();
        if (editorRef.current) {
          updateContainerHeight();
        }
      }
    }, [updateContainerHeight]);

    return (
      <div
        ref={containerRef}
        className={cn(
          "z-10 mr-4 flex flex-col relative gap-1 w-[470px] max-w-full bg-editor rounded border p-2 pl-3",
          layout === "Terminal" && "flex-row items-center p-0.5",
          className
        )}
        onMouseDown={(e) => {
          stopPropagation(e);

          if (editorRef.current) {
            editorRef.current.commands.focus();
          }
        }}
      >
        {layout === "IDE" && (
          <button
            onMouseDown={handleCancel}
            onClick={handleCancel}
            className={cn(
              "absolute top-0.5 right-0.5 group p-0.5 hover:bg-muted-foreground/20 rounded hover:stroke-primary"
            )}
          >
            <XIcon className="size-3 stroke-muted-foreground hover:stroke-inherit" />
          </button>
        )}
        <TipTapEditor
          instructions={instructions}
          loading={loading}
          readOnly={instructions.length > 0}
          ref={editorRef}
          updateContainerHeight={updateContainerHeight}
          handleEscape={handleCancel}
          handleEnter={handleEnter}
        />
        <div
          className="h-5 flex gap-2"
          onMouseDown={(e) => {
            // Otherwise the editor will steal the focus.
            stopPropagation(e);
            if (editorRef.current) {
              editorRef.current.commands.focus();
            }
          }}
        >
          {!loading && (
            <Button
              variant={layout === "Terminal" ? "ghost" : "outline"}
              onClick={() =>
                instructions.length > 0 ? handleAccept() : handleSubmit()
              }
              className={cn(
                "gap-1 px-2.5 py-0.5 h-5 w-fit rounded font-medium items-center bg-transparent",
                layout === "Terminal" && "text-muted-foreground/50 gap-0.5",
                "shadow-none text-muted-foreground"
              )}
              style={{ fontSize: "11px" }}
            >
              {instructions.length > 0 ? "Accept" : "Generate"}
              <BoardKey
                variant="minimal"
                characters={instructions.length > 0 ? ["⌘", "⏎"] : ["⏎"]}
                className="text-muted-foreground mt-0.5"
                fontSize="8px"
              />
            </Button>
          )}
          {loading && <Loading />}
          {(loading || instructions.length > 0) && (
            <Button
              variant={"ghost"}
              onClick={handleCancel}
              className={cn(
                "gap-1 px-2.5 py-0.5 h-5 w-fit rounded font-medium items-center bg-transparent",
                layout === "Terminal" && "text-muted-foreground/50 gap-0.5",
                "shadow-none text-muted-foreground"
              )}
              style={{ fontSize: "11px" }}
            >
              Cancel
              <BoardKey
                variant="minimal"
                characters={["⌘", "⌫"]}
                className="text-muted-foreground mt-0.5"
                fontSize="8px"
              />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

export default class InlineCommandWidget {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private domNode: HTMLDivElement | null = null;
  private root: Root | null = null;
  private viewZone: monaco.editor.IViewZone | null = null;
  private decorations: monaco.editor.IEditorDecorationsCollection;
  private editorRef = createRef<Editor>();
  private viewZoneId: string | null = null;
  private panelId: string;
  private static activeInstance: InlineCommandWidget | null = null;
  private toast: (props: ToasterToast) => void;
  private onDispose?: () => void;

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    panelId: string,
    toast: (props: ToasterToast) => void,
    onDispose?: () => void
  ) {
    this.panelId = panelId;
    this.editor = editor;
    this.decorations = this.editor.createDecorationsCollection();
    this.onDispose = onDispose;
    this.toast = toast;
  }

  private createNewDomNode() {
    this.domNode = document.createElement("div");
    document.getElementById("widget-container")?.appendChild(this.domNode);
    this.root = createRoot(this.domNode);
  }

  private handleSubmit = () => {
    this.dispose();
    this.editor.focus();
  };

  private handleCancel = () => {
    this.dispose();
    this.editor.focus();
  };

  private handleError = () => {};

  dispose() {
    console.log("Dispposing");
    if (this.viewZoneId) {
      this.editor.changeViewZones((accessor) => {
        accessor.removeZone(this.viewZoneId!);
      });
      this.viewZoneId = null;
    }
    this.decorations.clear();
    if (this.root) {
      this.root.unmount();
      this.root = null;
      this.domNode = null;
    }
    InlineCommandWidget.activeInstance = null;
    if (this.onDispose) {
      this.onDispose();
    }
  }

  private handleHeightChange = (height: number) => {
    if (this.viewZone && this.viewZoneId) {
      this.viewZone.heightInPx = height;
      this.editor.changeViewZones((accessor) => {
        accessor.layoutZone(this.viewZoneId!);
      });
    }
  };

  ref() {
    return this.editorRef;
  }

  focus() {
    if (this.editorRef.current) {
      this.editorRef.current.commands.focus();
    }
  }

  /**
   * Displays the inline command widget within the editor.
   *
   * This method ensures that only one active instance of the widget exists at a time.
   * If an instance is already active, it will be disposed of before creating a new one.
   *
   * The widget is rendered using React, and since it operates within a portal,
   * the necessary providers (`Provider` and `PanelProvider`) are re-created and injected
   * during each invocation to ensure proper context and state management.
   *
   * The widget is positioned relative to the editor's current cursor position,
   * and view zones and decorations are updated accordingly. If the target line is
   * outside the visible range, the editor will scroll to reveal it.
   */
  show() {
    // If there's already an active instance, dispose of it
    if (InlineCommandWidget.activeInstance) {
      if (InlineCommandWidget.activeInstance === this) {
        return; // Avoid showing again if one instance is already active
      }
      InlineCommandWidget.activeInstance.dispose();
    }

    const position = this.editor.getPosition();
    if (!position) return;

    // Create new DOM node and root for each show
    this.createNewDomNode();
    if (!this.domNode) return;

    const targetLine = Math.max(position.lineNumber - 1, 0);

    this.viewZone = {
      domNode: this.domNode,
      afterLineNumber: targetLine,
      heightInPx: 40,
      suppressMouseDown: true,
    };

    this.editor.changeViewZones((accessor) => {
      this.viewZoneId = accessor.addZone(this.viewZone!);
    });

    this.decorations.set([
      {
        range: new monaco.Range(targetLine, 1, targetLine, 1),
        options: {},
      },
    ]);

    if (this.root) {
      this.root.render(
        <Provider store={store}>
          <PanelProvider panel={{ id: this.panelId }}>
            <InlineCommand
              editor={this.editor}
              ref={this.editorRef}
              onSubmit={this.handleSubmit}
              onCancel={this.handleCancel}
              onHeightChange={this.handleHeightChange}
              onError={this.handleError}
            />
          </PanelProvider>
        </Provider>
      );
    }

    const visibleRange = this.editor.getVisibleRanges()[0];
    if (position.lineNumber - 1 < visibleRange.startLineNumber) {
      this.editor.revealLineInCenter(targetLine);
    }

    // Set this as the active instance
    InlineCommandWidget.activeInstance = this;
  }
}

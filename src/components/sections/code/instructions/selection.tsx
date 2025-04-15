import * as monaco from "monaco-editor";

export default class SelectionPlaceholderWidget
  implements monaco.editor.IContentWidget
{
  private static readonly ID = "selection-placeholder-widget";
  private position: monaco.Position | null = null;
  private domNode: HTMLElement;
  private visible: boolean = false;

  constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
    this.domNode = document.createElement("div");
    this.domNode.className = "selection-placeholder";
    this.domNode.textContent = "⌘⏎ to run";
    this.domNode.style.color = "gray";
    this.domNode.style.opacity = "0.3";
    this.domNode.style.fontWeight = "300";
    this.domNode.style.fontSize = "12px";
    this.domNode.style.pointerEvents = "none";
    this.domNode.style.marginLeft = "12px";
    this.domNode.style.whiteSpace = "nowrap";
    this.domNode.style.display = "inline-block";

    // Update on selection changes
    editor.onDidChangeCursorSelection((e) => {
      this.updateVisibility(e.selection);
    });

    // Also update when cursor position changes
    editor.onDidChangeCursorPosition(() => {
      const selection = editor.getSelection();
      if (selection) {
        this.updateVisibility(selection);
      }
    });

    this.editor.addContentWidget(this);
  }

  private updateVisibility(selection: monaco.Selection): void {
    // Check if there's an actual selection (not just a cursor position)
    if (selection && !selection.isEmpty()) {
      const selectedText = this.editor.getModel()?.getValueInRange(selection);

      // Trim the selected text and check if it has content
      if (selectedText?.trim()) {
        this.visible = true;
        // Position widget at the end of the selection
        this.position = new monaco.Position(
          selection.endLineNumber,
          selection.endColumn
        );
      } else {
        this.visible = false;
        this.position = null;
      }
    } else {
      this.visible = false;
      this.position = null;
    }

    this.editor.layoutContentWidget(this);
  }

  getId(): string {
    return SelectionPlaceholderWidget.ID;
  }

  getDomNode(): HTMLElement {
    return this.domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    if (!this.visible || !this.position) return null;

    return {
      position: this.position,
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    };
  }

  dispose(): void {
    this.editor.removeContentWidget(this);
  }
}

import * as monaco from "monaco-editor";

export default class PlaceholderWidget implements monaco.editor.IContentWidget {
  private static readonly ID = "line-placeholder-widget";
  private position: monaco.Position | null = null;
  private domNode: HTMLElement;

  constructor(private editor: monaco.editor.IStandaloneCodeEditor) {
    this.domNode = document.createElement("div");
    this.domNode.className = "inline-placeholder";
    this.domNode.textContent = "⌘K to generate";
    this.domNode.style.color = "gray";
    this.domNode.style.opacity = "0.3";
    this.domNode.style.fontWeight = "300";
    this.domNode.style.fontSize = "12px";
    this.domNode.style.pointerEvents = "none";
    this.domNode.style.marginLeft = "12px";
    this.domNode.style.whiteSpace = "nowrap";
    this.domNode.style.display = "inline-block";

    editor.onDidChangeCursorPosition((e) => {
      this.updatePosition(e.position);
    });

    this.editor.addContentWidget(this);
    // Force initial layout after a short delay
    setTimeout(() => {
      this.updatePosition(editor.getPosition() || new monaco.Position(1, 1));
    }, 50);
  }

  getId(): string {
    return PlaceholderWidget.ID;
  }

  getDomNode(): HTMLElement {
    return this.domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    if (!this.position) return null;

    // Only show if the line is empty
    const model = this.editor.getModel();
    if (!model) return null;

    if (!this.editor.getSelection()?.isEmpty()) {
      return null;
    }

    const lineContent = model.getLineContent(this.position.lineNumber).trim();
    if (lineContent !== "") return null;

    return {
      position: new monaco.Position(this.position.lineNumber, 1),
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    };
  }

  updatePosition(position: monaco.Position): void {
    this.position = position;
    this.editor.layoutContentWidget(this);
  }

  dispose(): void {
    this.editor.removeContentWidget(this);
  }
}

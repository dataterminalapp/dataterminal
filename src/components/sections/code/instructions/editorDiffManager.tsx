import { makeDiff } from "@sanity/diff-match-patch";
import * as monaco from "monaco-editor";

interface TextDiffDecorationOptions {
  added: monaco.editor.IModelDecorationOptions;
}

class EditorDiffManager {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private decorationOptions: TextDiffDecorationOptions;
  private originalContent: string | null = null;
  private decorations: string[] = [];
  private widgets: monaco.editor.IContentWidget[] = [];

  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    decorationOptions?: Partial<TextDiffDecorationOptions>
  ) {
    this.editor = editor;
    this.decorationOptions = {
      added: {
        className: "diff-inline-added",
        isWholeLine: true,
        inlineClassName: "diff-inline-added",
        minimap: {
          color: { id: "diffEditor.insertedLineBackground" },
          position: monaco.editor.MinimapPosition.Inline,
        },
        marginClassName: "diff-inline-added-margin",
        linesDecorationsClassName: "diff-inline-added-margin",
        overviewRuler: {
          color: { id: "diffEditor.insertedLineBackground" },
          position: monaco.editor.OverviewRulerLane.Full,
        },
      },
      ...decorationOptions,
    };

    this.addStyles();

    this.registerCommands();
  }

  private registerCommands(): void {
    this.editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyCode.Enter,
      () => {
        this.acceptChanges();
      },
      "!findWidgetVisible && !suggestionWidgetVisible"
    );

    this.editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyCode.Escape,
      () => {
        this.cancelChanges();
      },
      "!findWidgetVisible && !suggestionWidgetVisible"
    );
  }

  private addStyles(): void {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .diff-inline-added {
        background-color: rgba(52, 58, 40, 0.4);
      }
    `;
    document.head.appendChild(styleElement);
  }

  public applyCodeDiff(newCode: string): void {
    const model = this.editor.getModel();
    if (!model) {
      console.warn("Editor model not available");
      return;
    }

    this.originalContent = model.getValue();

    this.updateModelContent(model, newCode);
    const decorations = this.calculateDiffDecorations(
      model,
      this.originalContent,
      newCode
    );
    this.decorations = this.applyDecorations(model, decorations);
  }

  public acceptChanges(): void {
    const model = this.editor.getModel();
    if (model) {
      this.decorations = model.deltaDecorations(this.decorations, []);
      this.originalContent = null;
    }
  }

  public cancelChanges(): void {
    const model = this.editor.getModel();
    if (model && this.originalContent !== null) {
      this.updateModelContent(model, this.originalContent);
      this.decorations = model.deltaDecorations(this.decorations, []);
      this.originalContent = null;
    }
  }

  private updateModelContent(
    model: monaco.editor.ITextModel,
    newText: string
  ): void {
    model.pushEditOperations(
      [],
      [
        {
          range: model.getFullModelRange(),
          text: newText,
        },
      ],
      () => null
    );
  }

  private calculateDiffDecorations(
    model: monaco.editor.ITextModel,
    oldText: string,
    newText: string
  ): monaco.editor.IModelDeltaDecoration[] {
    const diffs = makeDiff(oldText, newText);
    return this.convertDiffsToDecorations(model, diffs);
  }

  private convertDiffsToDecorations(
    model: monaco.editor.ITextModel,
    diffs: Array<[number, string]>
  ): monaco.editor.IModelDeltaDecoration[] {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    let position = model.getPositionAt(0);

    for (const [type, text] of diffs) {
      switch (type) {
        case -1: // Removed text
        case 1: // Added text
          position = this.handleAddedText(model, position, text, decorations);
          break;
        case 0: // Unchanged text
          position = this.movePosition(model, position, text);
          break;
      }
    }

    return decorations;
  }

  private handleAddedText(
    model: monaco.editor.ITextModel,
    startPos: monaco.Position,
    text: string,
    decorations: monaco.editor.IModelDeltaDecoration[]
  ): monaco.Position {
    const endPos = model.getPositionAt(
      model.getOffsetAt(startPos) + text.length
    );

    decorations.push({
      range: new monaco.Range(
        startPos.lineNumber,
        startPos.column,
        endPos.lineNumber,
        endPos.column
      ),
      options: this.decorationOptions.added,
    });

    return endPos;
  }

  private movePosition(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    text: string
  ): monaco.Position {
    return model.getPositionAt(model.getOffsetAt(position) + text.length);
  }

  private applyDecorations(
    model: monaco.editor.ITextModel,
    decorations: monaco.editor.IModelDeltaDecoration[]
  ): string[] {
    return model.deltaDecorations(this.decorations, decorations);
  }

  public hasPendingChanges(): boolean {
    return this.originalContent !== null;
  }
}

export default EditorDiffManager;

import * as vscode from "vscode";
import { parseFootnoteModel } from "./footnoteModel";

/**
 * 在 Markdown 中为脚注引用 [^id] 与定义 [^id]: 提供成对高亮（逻辑后续实现）。
 */
export class FootnoteHighlighter implements vscode.Disposable {
  private readonly decorationRef: vscode.TextEditorDecorationType;
  private readonly decorationDef: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.decorationRef = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor("editor.wordHighlightBackground"),
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
    this.decorationDef = vscode.window.createTextEditorDecorationType({
      backgroundColor: new vscode.ThemeColor("editor.wordHighlightStrongBackground"),
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });
  }

  activate(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration("footnoteHighlight");
    if (!config.get<boolean>("enabled", true)) {
      return;
    }

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.applyToActiveEditor()),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          this.applyToActiveEditor();
        }
      }),
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor === vscode.window.activeTextEditor) {
          this.applyToActiveEditor();
        }
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("footnoteHighlight")) {
          this.applyToActiveEditor();
        }
      }),
    );

    context.subscriptions.push(this);
    this.applyToActiveEditor();
  }

  refresh(): void {
    this.applyToActiveEditor();
  }

  private applyToActiveEditor(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      this.clearDecorations();
      return;
    }

    const config = vscode.workspace.getConfiguration("footnoteHighlight");
    const mode = config.get<"focus" | "all">("mode", "focus");
    const entries = parseFootnoteModel(editor.document);

    if (mode === "all") {
      editor.setDecorations(
        this.decorationRef,
        entries.flatMap((e) => e.references)
      );
      editor.setDecorations(
        this.decorationDef,
        entries
          .map((e) => e.definitionLabelRange)
          .filter((r): r is vscode.Range => Boolean(r))
      );
      return;
    }

    const pos = editor.selection.active;
    const focused = entries.find((e) => {
      if (e.definitionLabelRange && e.definitionLabelRange.contains(pos)) {
        return true;
      }
      return e.references.some((r) => r.contains(pos));
    });

    if (!focused) {
      editor.setDecorations(this.decorationRef, []);
      editor.setDecorations(this.decorationDef, []);
      return;
    }

    editor.setDecorations(this.decorationRef, focused.references);
    editor.setDecorations(
      this.decorationDef,
      focused.definitionLabelRange ? [focused.definitionLabelRange] : []
    );
  }

  private clearDecorations(): void {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.setDecorations(this.decorationRef, []);
      editor.setDecorations(this.decorationDef, []);
    }
  }

  dispose(): void {
    this.decorationRef.dispose();
    this.decorationDef.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }
}

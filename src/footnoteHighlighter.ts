import * as vscode from "vscode";
import { parseMarkdownFootnotes } from "./footnoteParser";

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
      })
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

    const { references, definitions } = parseMarkdownFootnotes(editor.document);
    editor.setDecorations(this.decorationRef, references);
    editor.setDecorations(this.decorationDef, definitions);
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

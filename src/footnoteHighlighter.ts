import * as vscode from "vscode";
import { parseFootnoteModel } from "./footnoteModel";

/**
 * Markdown 脚注高亮控制器。
 *
 * 支持两种模式：
 * - focus：光标停在某个脚注上时，仅高亮该脚注的所有引用与定义标签
 * - all：高亮全文所有脚注引用与定义标签
 */
export class FootnoteHighlighter implements vscode.Disposable {
  private readonly decorationRef: vscode.TextEditorDecorationType;
  private readonly decorationDef: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    // 选择 VS Code 主题自带的 word highlight 色，保证深浅主题都“顺眼”。
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
      // 编辑器切换/文档变化/光标移动/配置变化都会触发重算（逻辑轻量，适合即时反馈）。
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
    if (!editor) {
      this.clearDecorations();
      return;
    }

    const config = vscode.workspace.getConfiguration("footnoteHighlight");
    const mode = config.get<"focus" | "all">("mode", "focus");
    const entries = parseFootnoteModel(editor.document);
    if (entries.length === 0) {
      this.clearDecorations();
      return;
    }

    if (mode === "all") {
      // 全量高亮：直接展平 ranges。
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
    // focus 高亮：只在光标“命中”某个脚注引用或定义标签时生效。
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

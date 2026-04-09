import * as vscode from "vscode";
import { FootnoteHighlighter } from "./footnoteHighlighter";
import { FootnoteSidebarProvider } from "./footnoteSidebarProvider";
import { parseFootnoteModel } from "./footnoteModel";
import { AriaLabelSidebarProvider } from "./ariaLabelSidebarProvider";
import { ImageAltSidebarProvider } from "./imageAltSidebarProvider";
import { VisibilitySidebarProvider } from "./visibilitySidebarProvider";

/**
 * 扩展入口：
 * - 初始化高亮逻辑与两个侧栏视图（脚注、ARIA Labels）
 * - 注册命令（刷新、跳转）
 * - 监听光标位置以实现“像 Safari 一样的 focus 联动”
 */
let highlighter: FootnoteHighlighter | undefined;
let sidebar: FootnoteSidebarProvider | undefined;
let ariaSidebar: AriaLabelSidebarProvider | undefined;
let altSidebar: ImageAltSidebarProvider | undefined;
let visibilitySidebar: VisibilitySidebarProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
  highlighter = new FootnoteHighlighter();
  highlighter.activate(context);

  sidebar = new FootnoteSidebarProvider(context);
  ariaSidebar = new AriaLabelSidebarProvider(context);
  altSidebar = new ImageAltSidebarProvider(context);
  visibilitySidebar = new VisibilitySidebarProvider(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("footnoteHighlight.refresh", () => {
      highlighter?.refresh();
      sidebar?.refresh();
      ariaSidebar?.refresh();
      altSidebar?.refresh();
      visibilitySidebar?.refresh();
    }),
    vscode.commands.registerCommand(
      "footnoteHighlight.reveal",
      async (
        uriStr: string,
        start: { line: number; character: number },
        end: { line: number; character: number }
      ) => {
        // 统一的“跳转并选中”能力，供树视图条目复用（脚注/ARIA 都用它）。
        const uri = vscode.Uri.parse(uriStr);
        const doc = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(doc);
        const range = new vscode.Range(
          start.line,
          start.character,
          end.line,
          end.character
        );
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(range.start, range.end);
      }
    )
  );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (!sidebar) {
        return;
      }
      const editor = e.textEditor;
      if (editor.document.languageId !== "markdown") {
        return;
      }
      const pos = editor.selection.active;
      const entries = parseFootnoteModel(editor.document);
      // focus 联动：如果光标停在某个 `[^id]` 或 `[^id]:` 上，则侧栏自动定位到该脚注条目。
      const focused = entries.find((en) => {
        if (en.definitionLabelRange && en.definitionLabelRange.contains(pos)) {
          return true;
        }
        return en.references.some((r) => r.contains(pos));
      });
      if (focused) {
        sidebar.revealLabel(focused.label);
      }
    })
  );
}

export function deactivate(): void {
  visibilitySidebar?.dispose();
  visibilitySidebar = undefined;
  altSidebar?.dispose();
  altSidebar = undefined;
  ariaSidebar?.dispose();
  ariaSidebar = undefined;
  sidebar?.dispose();
  sidebar = undefined;
  highlighter?.dispose();
  highlighter = undefined;
}

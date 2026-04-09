import * as vscode from "vscode";
import { FootnoteHighlighter } from "./footnoteHighlighter";
import { FootnoteSidebarProvider } from "./footnoteSidebarProvider";
import { parseFootnoteModel } from "./footnoteModel";
import { AriaLabelSidebarProvider } from "./ariaLabelSidebarProvider";

let highlighter: FootnoteHighlighter | undefined;
let sidebar: FootnoteSidebarProvider | undefined;
let ariaSidebar: AriaLabelSidebarProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
  highlighter = new FootnoteHighlighter();
  highlighter.activate(context);

  sidebar = new FootnoteSidebarProvider(context);
  ariaSidebar = new AriaLabelSidebarProvider(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("footnoteHighlight.refresh", () => {
      highlighter?.refresh();
      sidebar?.refresh();
      ariaSidebar?.refresh();
    }),
    vscode.commands.registerCommand(
      "footnoteHighlight.reveal",
      async (
        uriStr: string,
        start: { line: number; character: number },
        end: { line: number; character: number }
      ) => {
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
  ariaSidebar?.dispose();
  ariaSidebar = undefined;
  sidebar?.dispose();
  sidebar = undefined;
  highlighter?.dispose();
  highlighter = undefined;
}

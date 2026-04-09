import * as vscode from "vscode";
import { FootnoteHighlighter } from "./footnoteHighlighter";
import { FootnoteSidebarProvider } from "./footnoteSidebarProvider";

let highlighter: FootnoteHighlighter | undefined;
let sidebar: FootnoteSidebarProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
  highlighter = new FootnoteHighlighter();
  highlighter.activate(context);

  sidebar = new FootnoteSidebarProvider(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("footnoteHighlight.refresh", () => {
      highlighter?.refresh();
      sidebar?.refresh();
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
}

export function deactivate(): void {
  sidebar?.dispose();
  sidebar = undefined;
  highlighter?.dispose();
  highlighter = undefined;
}

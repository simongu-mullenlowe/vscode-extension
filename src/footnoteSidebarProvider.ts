import * as vscode from "vscode";
import { parseFootnoteModel, type FootnoteEntry } from "./footnoteModel";

type FootnoteTreeItem =
  | { kind: "footnote"; entry: FootnoteEntry; document: vscode.TextDocument }
  | { kind: "def"; entry: FootnoteEntry; document: vscode.TextDocument }
  | { kind: "ref"; entry: FootnoteEntry; document: vscode.TextDocument; index: number };

export class FootnoteSidebarProvider implements vscode.TreeDataProvider<FootnoteTreeItem>, vscode.Disposable {
  private readonly _onDidChange = new vscode.EventEmitter<FootnoteTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private readonly disposables: vscode.Disposable[] = [];
  private treeView: vscode.TreeView<FootnoteTreeItem>;

  constructor(context: vscode.ExtensionContext) {
    this.treeView = vscode.window.createTreeView("footnoteHighlight.list", {
      treeDataProvider: this,
      showCollapseAll: true,
    });

    const refresh = () => this.refresh();
    this.disposables.push(
      this.treeView,
      vscode.window.onDidChangeActiveTextEditor(refresh),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document === vscode.window.activeTextEditor?.document) {
          refresh();
        }
      })
    );
    context.subscriptions.push({ dispose: () => this.dispose() });
    refresh();
  }

  refresh(): void {
    this.updateMessage();
    this._onDidChange.fire();
  }

  private updateMessage(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      this.treeView.message = "打开 Markdown 文件后，此处会列出脚注引用与定义，点击可跳转。";
      return;
    }
    const entries = parseFootnoteModel(editor.document);
    if (entries.length === 0) {
      this.treeView.message = "当前文档未发现 [^脚注] 或 [^脚注]: 定义。";
    } else {
      this.treeView.message = undefined;
    }
  }

  getTreeItem(element: FootnoteTreeItem): vscode.TreeItem {
    if (element.kind === "footnote") {
      const { entry, document } = element;
      const hasDef = Boolean(entry.definitionLabelRange);
      const refCount = entry.references.length;
      const item = new vscode.TreeItem(
        `[^${entry.label}]`,
        refCount + (hasDef ? 1 : 0) > 1
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.None
      );
      item.description = entry.definitionBody
        ? truncate(entry.definitionBody, 36)
        : hasDef
          ? ""
          : "（无定义行）";
      item.tooltip = new vscode.MarkdownString(
        `**[^${entry.label}]**\n\n` +
          (hasDef ? `定义：${entry.definitionBody || "（空）"}\n\n` : "") +
          `引用：${refCount} 处`
      );
      item.iconPath = new vscode.ThemeIcon("symbol-string");
      item.contextValue = "footnote";
      if (refCount + (hasDef ? 1 : 0) === 1) {
        const target =
          hasDef && entry.definitionLabelRange
            ? entry.definitionLabelRange
            : entry.references[0];
        if (target) {
          item.command = revealCommand(document.uri, target);
        }
      }
      return item;
    }

    if (element.kind === "def") {
      const { entry, document } = element;
      const item = new vscode.TreeItem("定义", vscode.TreeItemCollapsibleState.None);
      item.description = entry.definitionBody ? truncate(entry.definitionBody, 28) : undefined;
      item.iconPath = new vscode.ThemeIcon("bookmark");
      if (entry.definitionLabelRange) {
        item.command = revealCommand(document.uri, entry.definitionLabelRange);
      }
      return item;
    }

    const { entry, document, index } = element;
    const item = new vscode.TreeItem(`引用 ${index + 1}`, vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("references");
    const r = entry.references[index];
    if (r) {
      item.command = revealCommand(document.uri, r);
      item.description = `L${r.start.line + 1}`;
    }
    return item;
  }

  getChildren(element?: FootnoteTreeItem): FootnoteTreeItem[] {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      return [];
    }
    const document = editor.document;

    if (!element) {
      return parseFootnoteModel(document).map(
        (entry): FootnoteTreeItem => ({ kind: "footnote", entry, document })
      );
    }

    if (element.kind === "footnote") {
      const { entry } = element;
      const children: FootnoteTreeItem[] = [];
      if (entry.definitionLabelRange) {
        children.push({ kind: "def", entry, document });
      }
      entry.references.forEach((_, i) => {
        children.push({ kind: "ref", entry, document, index: i });
      });
      return children;
    }

    return [];
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables.length = 0;
    this._onDidChange.dispose();
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

function revealCommand(uri: vscode.Uri, range: vscode.Range): vscode.Command {
  return {
    command: "footnoteHighlight.reveal",
    title: "跳转",
    arguments: [
      uri.toString(),
      { line: range.start.line, character: range.start.character },
      { line: range.end.line, character: range.end.character },
    ],
  };
}

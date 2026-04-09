import * as vscode from "vscode";
import { parseAriaLabels, type AriaLabelEntry } from "./ariaLabelModel";

type AriaTreeItem = { kind: "aria"; entry: AriaLabelEntry; document: vscode.TextDocument };

export class AriaLabelSidebarProvider
  implements vscode.TreeDataProvider<AriaTreeItem>, vscode.Disposable
{
  private readonly _onDidChange = new vscode.EventEmitter<AriaTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private readonly disposables: vscode.Disposable[] = [];
  private readonly treeView: vscode.TreeView<AriaTreeItem>;
  private items: AriaTreeItem[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.treeView = vscode.window.createTreeView("footnoteHighlight.aria", {
      treeDataProvider: this,
      showCollapseAll: false,
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
    this.rebuildCache();
    this.updateMessage();
    this._onDidChange.fire();
  }

  private rebuildCache(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.items = [];
      return;
    }
    const document = editor.document;
    const labels = parseAriaLabels(document);
    this.items = labels.map((entry): AriaTreeItem => ({ kind: "aria", entry, document }));
  }

  private updateMessage(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.treeView.message = "打开文件后，此处会列出 aria-label，点击可跳转。";
      return;
    }
    if (this.items.length === 0) {
      this.treeView.message = "当前文件未发现 aria-label。";
    } else {
      this.treeView.message = undefined;
    }
  }

  getTreeItem(element: AriaTreeItem): vscode.TreeItem {
    const { entry, document } = element;
    const label = entry.value || "（空）";
    const item = new vscode.TreeItem(truncate(label, 60), vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("tag");
    item.description = `L${entry.line + 1}`;
    item.tooltip = new vscode.MarkdownString(`**aria-label**: ${escapeMd(entry.value)}\n\nL${entry.line + 1}`);
    item.command = {
      command: "footnoteHighlight.reveal",
      title: "跳转",
      arguments: [
        document.uri.toString(),
        { line: entry.range.start.line, character: entry.range.start.character },
        { line: entry.range.end.line, character: entry.range.end.character },
      ],
    };
    return item;
  }

  getChildren(element?: AriaTreeItem): AriaTreeItem[] {
    if (element) {
      return [];
    }
    return this.items;
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

function escapeMd(s: string): string {
  return s.replace(/([\\\\`*_{}\\[\\]()#+\\-.!|>])/g, "\\\\$1");
}


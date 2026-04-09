import * as vscode from "vscode";
import { parseVisibilityMarkers, type VisibilityEntry, type VisibilityKind } from "./visibilityModel";

type VisibilityTreeItem =
  | { kind: "group"; group: VisibilityKind; count: number }
  | { kind: "item"; entry: VisibilityEntry; document: vscode.TextDocument };

/**
 * Hidden / Visible 侧栏：
 * - 按 “Hidden / Visible” 分组展示源码中的可见性线索
 * - 点击条目跳转并选中对应片段（属性/样式文本）
 */
export class VisibilitySidebarProvider
  implements vscode.TreeDataProvider<VisibilityTreeItem>, vscode.Disposable
{
  private readonly _onDidChange = new vscode.EventEmitter<
    VisibilityTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private readonly disposables: vscode.Disposable[] = [];
  private readonly treeView: vscode.TreeView<VisibilityTreeItem>;

  private hiddenItems: VisibilityTreeItem[] = [];
  private visibleItems: VisibilityTreeItem[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.treeView = vscode.window.createTreeView("footnoteHighlight.visibility", {
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
    this.rebuildCache();
    this.updateMessage();
    this._onDidChange.fire();
  }

  private rebuildCache(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.hiddenItems = [];
      this.visibleItems = [];
      return;
    }
    const document = editor.document;
    const entries = parseVisibilityMarkers(document);

    this.hiddenItems = entries
      .filter((e) => e.kind === "hidden")
      .map((entry): VisibilityTreeItem => ({ kind: "item", entry, document }));
    this.visibleItems = entries
      .filter((e) => e.kind === "visible")
      .map((entry): VisibilityTreeItem => ({ kind: "item", entry, document }));
  }

  private updateMessage(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.treeView.message = "打开文件后，此处会列出隐藏/可见相关标记，点击可跳转。";
      return;
    }
    const total = this.hiddenItems.length + this.visibleItems.length;
    if (total === 0) {
      this.treeView.message = "当前文件未发现常见的 hidden/visible 标记（hidden、aria-hidden、display:none 等）。";
    } else {
      this.treeView.message = undefined;
    }
  }

  getTreeItem(element: VisibilityTreeItem): vscode.TreeItem {
    if (element.kind === "group") {
      const title = element.group === "hidden" ? "Hidden" : "Visible";
      const item = new vscode.TreeItem(
        `${title} (${element.count})`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.iconPath = new vscode.ThemeIcon(element.group === "hidden" ? "eye-closed" : "eye");
      return item;
    }

    const { entry, document } = element;
    const label = entry.reason;
    const item = new vscode.TreeItem(truncate(label, 64), vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon(entry.kind === "hidden" ? "eye-closed" : "eye");
    item.description = `L${entry.line + 1}`;
    item.tooltip = new vscode.MarkdownString(
      `**${entry.kind.toUpperCase()}**: ${escapeMd(entry.reason)}\n\nL${entry.line + 1}`
    );
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

  getChildren(element?: VisibilityTreeItem): VisibilityTreeItem[] {
    if (!element) {
      return [
        { kind: "group", group: "hidden", count: this.hiddenItems.length },
        { kind: "group", group: "visible", count: this.visibleItems.length },
      ];
    }
    if (element.kind !== "group") {
      return [];
    }
    return element.group === "hidden" ? this.hiddenItems : this.visibleItems;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this._onDidChange.dispose();
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function escapeMd(s: string): string {
  return s.replace(/([\\\\`*_{}\\[\\]()#+\\-.!|>])/g, "\\\\$1");
}


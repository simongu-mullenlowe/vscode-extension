import * as vscode from "vscode";
import { parseAriaLabels, type AriaLabelEntry } from "./ariaLabelModel";

/**
 * ARIA Labels 侧栏：
 * - 扫描当前活动编辑器文档中的 `aria-label`
 * - 以列表形式展示，点击后跳转并选中 label 的值
 *
 * 注：当前设计为“就地扫描活动文件”，不做跨文件索引，保证轻量与即时。
 */
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
    // `aplInspector.ariaLabels` 对应 package.json 里的 view id。
    this.treeView = vscode.window.createTreeView("aplInspector.ariaLabels", {
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
    // 解析器会尽量只抓“字面量”形式，避免误把表达式当作可显示文本。
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
    // tooltip 用 MarkdownString，且对内容转义，避免特殊字符破坏渲染。
    item.tooltip = new vscode.MarkdownString(`**aria-label**: ${escapeMd(entry.value)}\n\nL${entry.line + 1}`);
    item.command = {
      command: "aplInspector.reveal",
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
  // 侧栏条目过长会影响浏览体验；统一截断。
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

function escapeMd(s: string): string {
  // 仅用于 tooltip 渲染，避免 Markdown 特殊字符产生非预期格式。
  return s.replace(/([\\\\`*_{}\\[\\]()#+\\-.!|>])/g, "\\\\$1");
}


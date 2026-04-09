import * as vscode from "vscode";
import { parseImageAlts, type ImageAltEntry } from "./imageAltModel";

type AltTreeItem = { kind: "alt"; entry: ImageAltEntry; document: vscode.TextDocument };

/**
 * Image Alts 侧栏：
 * - 列出当前活动文件里的所有图片 alt（Markdown / HTML/JSX）
 * - 点击条目跳转并选中 alt 文本
 */
export class ImageAltSidebarProvider implements vscode.TreeDataProvider<AltTreeItem>, vscode.Disposable {
  private readonly _onDidChange = new vscode.EventEmitter<AltTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  private readonly disposables: vscode.Disposable[] = [];
  private readonly treeView: vscode.TreeView<AltTreeItem>;
  private items: AltTreeItem[] = [];

  constructor(context: vscode.ExtensionContext) {
    // `footnoteHighlight.alt` 对应 package.json 里的 view id。
    this.treeView = vscode.window.createTreeView("footnoteHighlight.alt", {
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
    const alts = parseImageAlts(document);
    this.items = alts.map((entry): AltTreeItem => ({ kind: "alt", entry, document }));
  }

  private updateMessage(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.treeView.message = "打开文件后，此处会列出图片 alt，点击可跳转。";
      return;
    }
    if (this.items.length === 0) {
      this.treeView.message = "当前文件未发现图片 alt（Markdown ![]() 或 <img alt=...>）。";
    } else {
      this.treeView.message = undefined;
    }
  }

  getTreeItem(element: AltTreeItem): vscode.TreeItem {
    const { entry, document } = element;
    const label = entry.value || "（空）";
    const item = new vscode.TreeItem(truncate(label, 60), vscode.TreeItemCollapsibleState.None);
    item.iconPath = new vscode.ThemeIcon("file-media");
    item.description = `L${entry.line + 1}${entry.kind === "markdown" ? " · MD" : " · IMG"}`;
    item.tooltip = new vscode.MarkdownString(
      `**alt** (${entry.kind}): ${escapeMd(entry.value)}\n\nL${entry.line + 1}`
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

  getChildren(element?: AltTreeItem): AltTreeItem[] {
    if (element) return [];
    return this.items;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this._onDidChange.dispose();
  }
}

function truncate(s: string, max: number): string {
  // 侧栏条目统一截断，避免撑爆布局。
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function escapeMd(s: string): string {
  // 用于 tooltip 的 MarkdownString，避免特殊字符影响渲染。
  return s.replace(/([\\\\`*_{}\\[\\]()#+\\-.!|>])/g, "\\\\$1");
}


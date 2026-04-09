import * as vscode from "vscode";
import { parseFootnoteModel } from "./footnoteModel";

/**
 * 仅用于“高亮”场景的轻量结构：
 * - references: 文中的所有 `[^id]` ranges
 * - definitions: 文中的所有 `[^id]:` 标签 ranges
 *
 * 注：更完整的聚合与排序逻辑在 `parseFootnoteModel` 中实现。
 */
export interface FootnoteParseResult {
  /** [^label] 正文中的引用范围 */
  references: vscode.Range[];
  /** [^label]: 行首定义范围 */
  definitions: vscode.Range[];
}

export function parseMarkdownFootnotes(document: vscode.TextDocument): FootnoteParseResult {
  // 复用 model 解析，避免重复维护正则与边界条件。
  const entries = parseFootnoteModel(document);
  const references = entries.flatMap((e) => e.references);
  const definitions = entries
    .map((e) => e.definitionLabelRange)
    .filter((r): r is vscode.Range => Boolean(r));
  return { references, definitions };
}

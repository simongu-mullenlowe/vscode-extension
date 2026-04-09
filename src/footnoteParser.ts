import * as vscode from "vscode";
import { parseFootnoteModel } from "./footnoteModel";

export interface FootnoteParseResult {
  /** [^label] 正文中的引用范围 */
  references: vscode.Range[];
  /** [^label]: 行首定义范围 */
  definitions: vscode.Range[];
}

export function parseMarkdownFootnotes(document: vscode.TextDocument): FootnoteParseResult {
  const entries = parseFootnoteModel(document);
  const references = entries.flatMap((e) => e.references);
  const definitions = entries
    .map((e) => e.definitionLabelRange)
    .filter((r): r is vscode.Range => Boolean(r));
  return { references, definitions };
}

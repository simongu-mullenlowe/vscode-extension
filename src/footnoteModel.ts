import * as vscode from "vscode";

/**
 * 单个脚注条目（按 label 聚合）：
 * - 同一 label 可能在正文出现多次引用
 * - 定义行最多取第一处（后续可扩展为“多定义提示”）
 */
export interface FootnoteEntry {
  label: string;
  references: vscode.Range[];
  /** `[ ^ id ] :` 在文档中的范围 */
  definitionLabelRange?: vscode.Range;
  /** 冒号后的脚注正文预览（单行，已 trim） */
  definitionBody: string;
}

/**
 * 排序策略：
 * - 优先按定义出现位置排序（更符合阅读习惯）
 * - 没定义时退化到第一处引用位置
 */
function definitionSortPosition(entry: FootnoteEntry, document: vscode.TextDocument): number {
  if (entry.definitionLabelRange) {
    return document.offsetAt(entry.definitionLabelRange.start);
  }
  if (entry.references.length > 0) {
    return document.offsetAt(entry.references[0].start);
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * 解析 Markdown 脚注模型：引用 `[^id]` 与行首定义 `[^id]:`。
 */
export function parseFootnoteModel(document: vscode.TextDocument): FootnoteEntry[] {
  const text = document.getText();
  // label -> 聚合数据（引用 ranges、定义 range、定义正文预览）
  const byLabel = new Map<
    string,
    { references: vscode.Range[]; definitionLabelRange?: vscode.Range; definitionBody: string }
  >();

  const refRegex = /\[\^([^\]\s]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = refRegex.exec(text)) !== null) {
    const label = m[1];
    const start = document.positionAt(m.index);
    const end = document.positionAt(m.index + m[0].length);
    const range = new vscode.Range(start, end);
    let bucket = byLabel.get(label);
    if (!bucket) {
      bucket = { references: [], definitionBody: "" };
      byLabel.set(label, bucket);
    }
    bucket.references.push(range);
  }

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    // 定义行：允许前导空白；只抓取“定义标签+冒号”及其后单行正文用于预览。
    const defMatch = /^\s*\[\^([^\]\s]+)\]:(.*)$/.exec(line.text);
    if (!defMatch) {
      continue;
    }
    const label = defMatch[1];
    const body = defMatch[2].trim();
    const trimmed = line.text.trimStart();
    const labelPart = trimmed.match(/^\[\^[^\]]+\]:/);
    if (!labelPart) {
      continue;
    }
    const startChar = line.text.length - trimmed.length;
    const start = line.range.start.translate(0, startChar);
    const end = start.translate(0, labelPart[0].length);
    const labelRange = new vscode.Range(start, end);

    let bucket = byLabel.get(label);
    if (!bucket) {
      bucket = { references: [], definitionBody: body };
      byLabel.set(label, bucket);
    }
    if (!bucket.definitionLabelRange) {
      bucket.definitionLabelRange = labelRange;
      bucket.definitionBody = body;
    }
  }

  const entries: FootnoteEntry[] = [];
  for (const [label, v] of byLabel) {
    entries.push({
      label,
      references: v.references,
      definitionLabelRange: v.definitionLabelRange,
      definitionBody: v.definitionBody,
    });
  }

  entries.sort((a, b) => definitionSortPosition(a, document) - definitionSortPosition(b, document));
  return entries;
}

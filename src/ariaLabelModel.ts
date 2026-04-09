import * as vscode from "vscode";

/**
 * 单个 aria-label 结果条目。
 * range 指向 label 值（不含引号），用于跳转与选中。
 */
export interface AriaLabelEntry {
  value: string;
  range: vscode.Range;
  line: number;
}

/**
 * 为避免极端大文件影响交互性能，扫描上限做一个软阈值。
 * 超出后只扫描前 MAX_SCAN_CHARS 个字符（对 UI 侧栏来说通常够用）。
 */
const MAX_SCAN_CHARS = 800_000;

/**
 * 从当前文档中提取 aria-label（HTML/JSX 常见写法）。
 * - aria-label="..."
 * - aria-label='...'
 * - aria-label={`...`} / aria-label={"..."} / aria-label={'...'}（只提取字面量）
 */
export function parseAriaLabels(document: vscode.TextDocument): AriaLabelEntry[] {
  const raw = document.getText();
  // 超大文件时截断扫描；range 依然基于原文 positionAt，可正常定位在前半段内容。
  const text = raw.length > MAX_SCAN_CHARS ? raw.slice(0, MAX_SCAN_CHARS) : raw;
  const results: AriaLabelEntry[] = [];

  // 多种常见形式：HTML/JSX 属性；JSX 字面量包裹；模板字符串字面量等。
  const patterns: RegExp[] = [
    /aria-label\s*=\s*"([^"]*)"/g,
    /aria-label\s*=\s*'([^']*)'/g,
    /aria-label\s*=\s*\{\s*"([^"]*)"\s*\}/g,
    /aria-label\s*=\s*\{\s*'([^']*)'\s*\}/g,
    /aria-label\s*=\s*\{\s*`([^`]*)`\s*\}/g,
    /aria-label\s*=\s*`([^`]*)`/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const full = m[0];
      const val = m[1] ?? "";

      // 让跳转更稳：定位到 value 的起止，而不是整个属性（属性名/等号/引号会被跳过）。
      const valueStartInMatch = full.indexOf(val);
      const startOffset = m.index + Math.max(0, valueStartInMatch);
      const endOffset = startOffset + val.length;

      const start = document.positionAt(startOffset);
      const end = document.positionAt(endOffset);
      results.push({
        value: val,
        range: new vscode.Range(start, end),
        line: start.line,
      });
    }
  }

  // 去重：同一 range/value 可能被多个 pattern 捕获（例如模板字符串形式）
  const seen = new Set<string>();
  const deduped: AriaLabelEntry[] = [];
  for (const r of results) {
    const key = `${r.range.start.line}:${r.range.start.character}-${r.range.end.line}:${r.range.end.character}:${r.value}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(r);
  }

  deduped.sort((a, b) => document.offsetAt(a.range.start) - document.offsetAt(b.range.start));
  return deduped;
}


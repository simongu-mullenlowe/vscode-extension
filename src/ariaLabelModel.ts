import * as vscode from "vscode";

export interface AriaLabelEntry {
  value: string;
  range: vscode.Range;
  line: number;
}

const MAX_SCAN_CHARS = 800_000;

/**
 * 从当前文档中提取 aria-label（HTML/JSX 常见写法）。
 * - aria-label="..."
 * - aria-label='...'
 * - aria-label={`...`} / aria-label={"..."} / aria-label={'...'}（只提取字面量）
 */
export function parseAriaLabels(document: vscode.TextDocument): AriaLabelEntry[] {
  const raw = document.getText();
  const text = raw.length > MAX_SCAN_CHARS ? raw.slice(0, MAX_SCAN_CHARS) : raw;
  const results: AriaLabelEntry[] = [];

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

      // 让跳转更稳：定位到 value 的起止，而不是整个属性
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


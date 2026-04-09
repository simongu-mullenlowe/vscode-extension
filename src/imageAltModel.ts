import * as vscode from "vscode";

/**
 * 单个图片 alt 条目。
 * - value: alt 文本（可能为空）
 * - range: 指向 alt 文本本身（不含引号/不含 `![` `]`）
 */
export interface ImageAltEntry {
  value: string;
  range: vscode.Range;
  line: number;
  kind: "markdown" | "html";
}

const MAX_SCAN_CHARS = 800_000;

/**
 * 提取当前文档中的图片 alt：
 * - Markdown: ![alt](url)
 * - HTML/JSX: <img ... alt="..."> / alt='...' / alt={"..."} / alt={`...`}
 *
 * 说明：
 * - 只提取字面量 alt，表达式 alt={foo} 不会被当作可展示文本。
 * - 这是轻量扫描器，不做完整语法解析；对不规范/极端写法可能漏检。
 */
export function parseImageAlts(document: vscode.TextDocument): ImageAltEntry[] {
  const raw = document.getText();
  const text = raw.length > MAX_SCAN_CHARS ? raw.slice(0, MAX_SCAN_CHARS) : raw;
  const results: ImageAltEntry[] = [];

  // Markdown: ![alt](...)，尽量避免跨行；alt 中允许空、以及常见转义。
  const mdRe = /!\[([^\]]*)\]\([^\)]*\)/g;
  {
    let m: RegExpExecArray | null;
    while ((m = mdRe.exec(text)) !== null) {
      const alt = m[1] ?? "";
      const full = m[0];
      const altStartInMatch = full.indexOf("[") + 1;
      const startOffset = m.index + Math.max(0, altStartInMatch);
      const endOffset = startOffset + alt.length;
      const start = document.positionAt(startOffset);
      const end = document.positionAt(endOffset);
      results.push({ value: alt, range: new vscode.Range(start, end), line: start.line, kind: "markdown" });
    }
  }

  // HTML/JSX alt 字面量（只抓取引号/模板字符串/字面量包裹）
  const htmlPatterns: RegExp[] = [
    /<img\b[^>]*\balt\s*=\s*"([^"]*)"[^>]*>/g,
    /<img\b[^>]*\balt\s*=\s*'([^']*)'[^>]*>/g,
    /<img\b[^>]*\balt\s*=\s*\{\s*"([^"]*)"\s*\}[^>]*>/g,
    /<img\b[^>]*\balt\s*=\s*\{\s*'([^']*)'\s*\}[^>]*>/g,
    /<img\b[^>]*\balt\s*=\s*\{\s*`([^`]*)`\s*\}[^>]*>/g,
    /<img\b[^>]*\balt\s*=\s*`([^`]*)`[^>]*>/g,
  ];

  for (const re of htmlPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const full = m[0];
      const alt = m[1] ?? "";
      const altStartInMatch = full.indexOf(alt);
      const startOffset = m.index + Math.max(0, altStartInMatch);
      const endOffset = startOffset + alt.length;
      const start = document.positionAt(startOffset);
      const end = document.positionAt(endOffset);
      results.push({ value: alt, range: new vscode.Range(start, end), line: start.line, kind: "html" });
    }
  }

  // 去重（多个 pattern 可能命中同一处）
  const seen = new Set<string>();
  const deduped: ImageAltEntry[] = [];
  for (const r of results) {
    const key = `${r.kind}:${r.range.start.line}:${r.range.start.character}-${r.range.end.line}:${r.range.end.character}:${r.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  deduped.sort((a, b) => document.offsetAt(a.range.start) - document.offsetAt(b.range.start));
  return deduped;
}


import * as vscode from "vscode";

export type VisibilityKind = "hidden" | "visible";

/**
 * “Hidden / Visible” 扫描结果条目（来自源码静态扫描，不是运行时 DOM）。
 */
export interface VisibilityEntry {
  kind: VisibilityKind;
  reason: string;
  range: vscode.Range;
  line: number;
  /** 侧栏主文案：如 visuallyhidden 元素内的纯文本 */
  displayText?: string;
}

const MAX_SCAN_CHARS = 800_000;

/**
 * 扫描当前文档中常见的“隐藏/可见”信号：
 * - HTML/JSX 属性：hidden
 * - CSS class：visuallyhidden / visually-hidden / sr-only（常见“视觉隐藏但可读”）
 * - inline style：display:none、visibility:hidden、opacity:0（常用于隐藏）
 *
 * 说明：
 * - 这是启发式扫描，旨在快速定位，不保证覆盖所有框架/写法。
 * - 只扫描当前活动文件。
 */
export function parseVisibilityMarkers(document: vscode.TextDocument): VisibilityEntry[] {
  const raw = document.getText();
  const text = raw.length > MAX_SCAN_CHARS ? raw.slice(0, MAX_SCAN_CHARS) : raw;
  const results: VisibilityEntry[] = [];

  // 1) `hidden` 属性（HTML/JSX）——严格按“单词边界”匹配，减少误报。
  const hiddenAttr = /\bhidden\b/g;
  pushAll(hiddenAttr, "hidden", "attribute: hidden");

  // 2) `<span class="visuallyhidden">...</span>`：抓取内部文本，侧栏展示文案，跳转选中内部文本。
  extractVisuallyHiddenSpanContent(document, text, results, "class", "visuallyhidden");
  extractVisuallyHiddenSpanContent(document, text, results, "class", "visually-hidden");
  extractVisuallyHiddenSpanContent(document, text, results, "class", "sr-only");
  extractVisuallyHiddenSpanContent(document, text, results, "className", "visuallyhidden");
  extractVisuallyHiddenSpanContent(document, text, results, "className", "visually-hidden");
  extractVisuallyHiddenSpanContent(document, text, results, "className", "sr-only");

  // 3) inline style 常见隐藏信号（HTML/JSX 字面量）
  // display:none
  pushAll(/\bdisplay\s*:\s*none\b/g, "hidden", "style: display:none");
  // visibility:hidden
  pushAll(/\bvisibility\s*:\s*hidden\b/g, "hidden", "style: visibility:hidden");
  // opacity:0（不等价隐藏，但在调试时很常见）
  pushAll(/\bopacity\s*:\s*0\b/g, "hidden", "style: opacity:0");

  // 4) 常见“显式可见”信号（少量）：display:block / inline / flex / grid / visibility:visible / opacity:1
  pushAll(
    /\bdisplay\s*:\s*(block|inline|inline-block|flex|grid)\b/g,
    "visible",
    "style: display:*"
  );
  pushAll(/\bvisibility\s*:\s*visible\b/g, "visible", "style: visibility:visible");
  pushAll(/\bopacity\s*:\s*1\b/g, "visible", "style: opacity:1");

  // 去重并按出现顺序排序
  const seen = new Set<string>();
  const deduped: VisibilityEntry[] = [];
  for (const r of results) {
    const key = `${r.kind}:${r.range.start.line}:${r.range.start.character}-${r.range.end.line}:${r.range.end.character}:${r.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  deduped.sort((a, b) => document.offsetAt(a.range.start) - document.offsetAt(b.range.start));
  return deduped;

  function pushAll(re: RegExp, kind: VisibilityKind, reason: string): void {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = document.positionAt(m.index);
      const end = document.positionAt(m.index + m[0].length);
      results.push({ kind, reason, range: new vscode.Range(start, end), line: start.line });
    }
  }
}

function stripInnerTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}

/**
 * 匹配 `<span class="...visuallyhidden...">内部文本</span>`（及 className / visually-hidden / sr-only），
 * 侧栏展示内部纯文本，range 指向内部文本（trim 后）便于选中复制。
 */
function extractVisuallyHiddenSpanContent(
  document: vscode.TextDocument,
  text: string,
  results: VisibilityEntry[],
  attr: "class" | "className",
  token: string
): void {
  const attrRe = attr === "class" ? "class" : "className";
  const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<span\\b[^>]*\\b${attrRe}\\s*=\\s*["'][^"']*\\b${escapedToken}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,
    "gi"
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const full = m[0];
    const innerRaw = m[1];
    const innerStartInFull = full.indexOf(innerRaw);
    const baseOffset = m.index + innerStartInFull;
    const leading = innerRaw.length - innerRaw.trimStart().length;
    const trimmed = innerRaw.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const startOffset = baseOffset + leading;
    const endOffset = startOffset + trimmed.length;
    const start = document.positionAt(startOffset);
    const end = document.positionAt(endOffset);
    const plain = stripInnerTags(trimmed).replace(/\s+/g, " ").trim();
    const display = plain || trimmed;
    results.push({
      kind: "hidden",
      reason: `visually hidden (${token})`,
      range: new vscode.Range(start, end),
      line: start.line,
      displayText: display,
    });
  }
}


import * as vscode from "vscode";

/**
 * 单个脚注条目（按 label 聚合）：
 * - 同一 label 可能在正文出现多次引用
 * - 定义行最多取第一处（后续可扩展为“多定义提示”）
 */
export interface FootnoteEntry {
  label: string;
  references: vscode.Range[];
  /**
   * 定义标签在文档中的范围：
   * - Markdown: `[^id]:` 这一段
   * - HTML: `id="fn1"` 里 `fn1` 这一段（只选中值，便于阅读/跳转）
   */
  definitionLabelRange?: vscode.Range;
  /** 定义正文预览（尽量单行、已 trim；HTML 会做简单去标签） */
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
 * 解析脚注模型（同时支持 Markdown 与 HTML-like）。
 *
 * HTML-like 的常见脚注约定（启发式）：
 * - 引用：`href="#fn1"` / `href="#footnote-1"` 等片段链接
 * - 定义：`id="fn1"` / `id="footnote-1"` 等被引用的锚点
 */
export function parseFootnoteModel(document: vscode.TextDocument): FootnoteEntry[] {
  if (isMarkdown(document)) {
    return parseMarkdownFootnotes(document);
  }
  if (isHtmlLike(document)) {
    return parseHtmlFootnotes(document);
  }
  return [];
}

function isMarkdown(document: vscode.TextDocument): boolean {
  return document.languageId === "markdown";
}

function isHtmlLike(document: vscode.TextDocument): boolean {
  // `.inc` 在不少项目里实际是 HTML 片段，但 VS Code 语言可能是 plaintext。
  const p = document.uri.fsPath.toLowerCase();
  if (p.endsWith(".inc")) return true;
  return document.languageId === "html" || p.endsWith(".html") || p.endsWith(".htm");
}

function parseMarkdownFootnotes(document: vscode.TextDocument): FootnoteEntry[] {
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

function parseHtmlFootnotes(document: vscode.TextDocument): FootnoteEntry[] {
  const text = document.getText();
  const byLabel = new Map<
    string,
    { references: vscode.Range[]; definitionLabelRange?: vscode.Range; definitionBody: string }
  >();

  // 引用：抓取 href="#xxx"（只保留常见脚注命名，避免页面内其它锚点噪音）
  // 允许：fn1 / fn-1 / footnote-1 / note-1 等
  const hrefRe = /\bhref\s*=\s*(["'])#([^"'\s>]+)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(text)) !== null) {
    const id = m[2];
    if (!looksLikeFootnoteId(id)) continue;

    // range 选中 fragment id（不含 # 与引号）
    const full = m[0];
    const idStartInMatch = full.toLowerCase().indexOf("#" + id.toLowerCase());
    const startOffset = m.index + Math.max(0, idStartInMatch + 1); // +1 跳过 '#'
    const endOffset = startOffset + id.length;
    const start = document.positionAt(startOffset);
    const end = document.positionAt(endOffset);
    const range = new vscode.Range(start, end);

    let bucket = byLabel.get(id);
    if (!bucket) {
      bucket = { references: [], definitionBody: "" };
      byLabel.set(id, bucket);
    }
    bucket.references.push(range);
  }

  // 定义：抓取 id="xxx"（同样只保留看起来像脚注的 id）
  const idRe = /\bid\s*=\s*(["'])([^"'\s>]+)\1/gi;
  while ((m = idRe.exec(text)) !== null) {
    const id = m[2];
    if (!looksLikeFootnoteId(id)) continue;

    // range 选中 id 值（不含引号）
    const full = m[0];
    const idStartInMatch = full.toLowerCase().indexOf(id.toLowerCase());
    const startOffset = m.index + Math.max(0, idStartInMatch);
    const endOffset = startOffset + id.length;
    const start = document.positionAt(startOffset);
    const end = document.positionAt(endOffset);
    const labelRange = new vscode.Range(start, end);

    // 预览：取同一行从该属性后开始的一小段文本，做简单去标签
    const line = document.lineAt(start.line).text;
    const preview = stripTags(line).trim();

    let bucket = byLabel.get(id);
    if (!bucket) {
      bucket = { references: [], definitionBody: preview };
      byLabel.set(id, bucket);
    }
    if (!bucket.definitionLabelRange) {
      bucket.definitionLabelRange = labelRange;
      if (!bucket.definitionBody) bucket.definitionBody = preview;
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

function looksLikeFootnoteId(id: string): boolean {
  // 经验规则：常见脚注 id 前缀
  return /^(fn|footnote|note)\b/i.test(id) || /^fn[-_]?/i.test(id);
}

function stripTags(s: string): string {
  // 非严格 HTML 解析，只做预览用途：去掉标签、压缩空白。
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

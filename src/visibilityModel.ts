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
}

const MAX_SCAN_CHARS = 800_000;

/**
 * 扫描当前文档中常见的“隐藏/可见”信号：
 * - HTML/JSX 属性：hidden、aria-hidden="true/false"
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

  // 2) aria-hidden 字面量 true/false（HTML 与 JSX 字面量包裹）
  pushAll(/\baria-hidden\s*=\s*"true"/g, "hidden", 'aria-hidden="true"');
  pushAll(/\baria-hidden\s*=\s*'true'/g, "hidden", "aria-hidden='true'");
  pushAll(/\baria-hidden\s*=\s*\{\s*true\s*\}/g, "hidden", "aria-hidden={true}");
  pushAll(/\baria-hidden\s*=\s*"false"/g, "visible", 'aria-hidden="false"');
  pushAll(/\baria-hidden\s*=\s*'false'/g, "visible", "aria-hidden='false'");
  pushAll(/\baria-hidden\s*=\s*\{\s*false\s*\}/g, "visible", "aria-hidden={false}");

  // 3) visually hidden class（常见可访问性写法）
  // 支持：class="... visuallyhidden ..." / class='... visually-hidden ...' / class={"..."}
  // 这里不做完整 class 解析，只做足够稳定的静态定位。
  pushAll(
    /\bclass\s*=\s*(["'])(?:(?!\1).)*\bvisuallyhidden\b(?:(?!\1).)*\1/gi,
    "hidden",
    "class: visuallyhidden"
  );
  pushAll(
    /\bclass\s*=\s*(["'])(?:(?!\1).)*\bvisually-hidden\b(?:(?!\1).)*\1/gi,
    "hidden",
    "class: visually-hidden"
  );
  pushAll(
    /\bclass\s*=\s*(["'])(?:(?!\1).)*\bsr-only\b(?:(?!\1).)*\1/gi,
    "hidden",
    "class: sr-only"
  );
  pushAll(
    /\bclassName\s*=\s*(["'])(?:(?!\1).)*\bvisuallyhidden\b(?:(?!\1).)*\1/gi,
    "hidden",
    "className: visuallyhidden"
  );
  pushAll(
    /\bclassName\s*=\s*(["'])(?:(?!\1).)*\bvisually-hidden\b(?:(?!\1).)*\1/gi,
    "hidden",
    "className: visually-hidden"
  );
  pushAll(
    /\bclassName\s*=\s*(["'])(?:(?!\1).)*\bsr-only\b(?:(?!\1).)*\1/gi,
    "hidden",
    "className: sr-only"
  );

  // 4) inline style 常见隐藏信号（HTML/JSX 字面量）
  // display:none
  pushAll(/\bdisplay\s*:\s*none\b/g, "hidden", "style: display:none");
  // visibility:hidden
  pushAll(/\bvisibility\s*:\s*hidden\b/g, "hidden", "style: visibility:hidden");
  // opacity:0（不等价隐藏，但在调试时很常见）
  pushAll(/\bopacity\s*:\s*0\b/g, "hidden", "style: opacity:0");

  // 5) 常见“显式可见”信号（少量）：display:block / inline / flex / grid / visibility:visible / opacity:1
  pushAll(/\bdisplay\s*:\s*(block|inline|inline-block|flex|grid)\b/g, "visible", "style: display:*");
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


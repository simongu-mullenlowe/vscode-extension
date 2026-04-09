# Footnote Highlight (VS Code Extension)

一个用于 **HTML 脚注**与 **可访问性文本（ARIA/ALT）**快速定位的 VS Code 扩展（也兼容 Markdown 风格脚注）。

An extension for quickly navigating **HTML footnotes** and accessibility text (**ARIA/ALT**) in VS Code (also supports Markdown-style footnotes).

## 功能

### 脚注（Footnotes）

- **Focus 高亮（默认）**：当光标停在“同一条脚注”的引用或定义上时，仅高亮该脚注组。
- **侧栏脚注列表**：在左侧活动栏「脚注」容器下展示脚注条目，点击可跳转到对应位置。

支持的脚注形态：

- **HTML（推荐，适用于 `.html` / `.inc`）**
  - 引用：`href="#fn..."` / `href="#footnote..."` / `href="#note..."`
  - 定义：`id="fn..."` / `id="footnote..."` / `id="note..."`
- **Markdown（兼容）**
  - 引用：`[^id]`
  - 定义：`[^id]:`

English:

- **Focus highlight (default)**: when your cursor is on a footnote reference/definition, only highlight that footnote group.
- **Footnotes sidebar**: shows footnote entries in the Activity Bar container, click to jump.

Supported formats:

- **HTML (recommended, for `.html` / `.inc`)**
  - References: `href="#fn..."` / `href="#footnote..."` / `href="#note..."`
  - Definitions: `id="fn..."` / `id="footnote..."` / `id="note..."`
- **Markdown (compatible)**
  - References: `[^id]`
  - Definitions: `[^id]:`

### ARIA Labels

- **侧栏列出当前文件全部 `aria-label`**（HTML/JSX 常见写法）。
- 点击条目跳转并选中 `aria-label` 的值。

English:

- Lists all `aria-label` values in the current file (common HTML/JSX patterns).
- Click an item to jump and select the label value.

### Image Alts

- **侧栏列出当前文件全部图片 `alt`**：
  - Markdown：`![alt](url)`
  - HTML/JSX：`<img ... alt=\"...\">` / `alt={'...'}` / `alt={`...`}`（仅字面量）
- 点击条目跳转并选中 alt 文本。

English:

- Lists all image `alt` text in the current file:
  - Markdown: `![alt](url)`
  - HTML/JSX: `<img ... alt=\"...\">` / `alt={'...'}` / `alt={`...`}` (literals only)
- Click an item to jump and select the alt text.

### Hidden / Visible

- **侧栏按 Hidden / Visible 分组**列出当前文件里常见的“隐藏/可见”标记（静态扫描，便于定位）：
  - Hidden：`hidden`、`aria-hidden="true"`、`display:none`、`visibility:hidden`、`opacity:0`
  - Visible：`aria-hidden="false"`、`display:block/inline/flex/grid`、`visibility:visible`、`opacity:1`
- 点击条目跳转并选中对应片段。

English:

- Groups common visibility markers found in the current file (static scan for quick navigation):
  - Hidden: `hidden`, `aria-hidden="true"`, `display:none`, `visibility:hidden`, `opacity:0`
  - Visible: `aria-hidden="false"`, `display:block/inline/flex/grid`, `visibility:visible`, `opacity:1`
- Click an item to jump and select the matched snippet.

## 使用

安装后，在左侧活动栏会出现「脚注」图标：

- **脚注列表**：展示脚注条目与引用/定义
- **ARIA Labels**：展示 `aria-label` 列表
- **Image Alts**：展示图片 `alt` 列表
- **Hidden / Visible**：展示隐藏/可见标记分组

右上角支持 **刷新**（命令：`脚注: 刷新`）。

English:

After installing, a **Footnote** icon appears in the Activity Bar:

- **Footnotes**: footnote entries with references/definition
- **ARIA Labels**: `aria-label` list
- **Image Alts**: image `alt` list
- **Hidden / Visible**: grouped visibility markers

Use **Refresh** (command: `脚注: 刷新`) from the view title actions.

## 配置

在设置中搜索 `Footnote Highlight`：

- `footnoteHighlight.enabled`：是否启用
- `footnoteHighlight.mode`：
  - `focus`：光标命中脚注时，仅高亮该组
  - `all`：高亮全文所有脚注引用/定义标签

English:

Search `Footnote Highlight` in Settings:

- `footnoteHighlight.enabled`: enable/disable
- `footnoteHighlight.mode`:
  - `focus`: highlight only the current footnote group under cursor
  - `all`: highlight all footnotes in the document

## 开发

```bash
npm install
npm run watch
```

在 VS Code 中按 `F5` 运行「Extension Development Host」进行调试。

English:

Press `F5` in VS Code to launch the **Extension Development Host**.

## 打包（VSIX）

```bash
npm run package
```

生成的 `.vsix` 可通过 VS Code/Cursor 的 “Install from VSIX…” 安装。

English:

The generated `.vsix` can be installed via “Install from VSIX…” in VS Code/Cursor.


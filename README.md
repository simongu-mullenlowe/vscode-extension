# APL Inspector

A VS Code **sidebar inspector** for navigating page-oriented code: **HTML footnotes**, **`aria-label`**, **image `alt`**, and common **hidden / visible** markers. Pixel-style **APL** activity bar branding. Markdown-style footnotes are supported as well.

## Features

### Footnotes

- **Focus highlight (default):** when the cursor is on a footnote reference or definition, only that footnote group is highlighted.
- **Footnotes view:** lists footnote entries in the Activity Bar; click to jump.

Supported shapes:

- **HTML** (recommended for `.html` / `.inc`): references `href="#fn..."` / `#footnote...` / `#note...`; definitions `id="fn..."` / `footnote` / `note`.
- **Markdown:** references `[^id]`, definitions `[^id]:`.

### ARIA labels

- Lists all `aria-label` values in the current file (typical HTML/JSX patterns).
- Click an item to jump and select the attribute value.

### Image `alt`

- Lists image alt text: Markdown `![alt](url)`; HTML/JSX `<img alt="...">`, `alt={'...'}`, template literals where applicable.
- Click to jump and select the alt string.

### Hidden / Visible

- For `<span class="visuallyhidden">` (also `visually-hidden`, `sr-only`, and `className` in JSX), the list shows the **text inside the span** (e.g. “现有银色…”); click to jump and select that inner text.
- Other hidden/visible snippets (static scan): `hidden`, `display:none`, `visibility:hidden`, `opacity:0`; visible: `display:flex`, `opacity:1`, etc.

## Usage

After install, open the **APL** icon in the Activity Bar:

- **脚注列表** — footnotes
- **ARIA Labels**
- **Image Alts**
- **Hidden / Visible**

Use **Refresh** in the view title (`APL Inspector: 刷新`).

## Settings

Search **APL Inspector** in Settings:

| Setting | Description |
|--------|-------------|
| `aplInspector.enabled` | Turn the extension on or off. |
| `aplInspector.mode` | `focus` — highlight only the footnote group under the cursor; `all` — highlight every footnote in the file. |

## Development

```bash
npm install
npm run watch
```

Press **F5** to start the Extension Development Host.

## Build (VSIX)

```bash
npm run package
```

Install the generated `.vsix` with **Install from VSIX…** in VS Code or Cursor.

## Author & feedback

- **Simon Gu**
- `simon.gu@mullenlowe.com`

---

## 简体中文

**APL Inspector** 是 VS Code 侧栏检查工具：脚注、ARIA label、图片 `alt`、Hidden/Visible 等快速定位；活动栏为像素风 **APL** 图标。兼容 Markdown 脚注写法。

**功能概要：** 脚注支持 Focus/全文高亮与列表跳转；ARIA / ALT 列表可点击跳转选中；**`<span class="visuallyhidden">` 等会在侧栏显示元素内文字**并跳转选中该段文字；其它 hidden/visible 规则见英文 Features。

**使用：** 安装后点击左侧 **APL**，在对应视图中查看；视图标题栏可 **刷新**。

**设置：** `aplInspector.enabled` 开关；`aplInspector.mode` 选 `focus` 或 `all`。

**开发与打包：** `npm install` → `npm run watch`；`npm run package` 生成 VSIX。

**作者与反馈：** Simon Gu · `simon.gu@mullenlowe.com`

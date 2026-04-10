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

- Groups common visibility-related snippets (static scan): hidden patterns such as `visuallyhidden`, `sr-only`, `hidden`, `display:none`, etc.; visible patterns such as `display:flex`, `opacity:1`, etc.
- Click to jump and select the match.

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

**功能概要：** 脚注支持 Focus/全文高亮与列表跳转；ARIA / ALT / 可见性分组列表均可点击跳转选中。

**使用：** 安装后点击左侧 **APL**，在对应视图中查看；视图标题栏可 **刷新**。

**设置：** `aplInspector.enabled` 开关；`aplInspector.mode` 选 `focus` 或 `all`。

**开发与打包：** `npm install` → `npm run watch`；`npm run package` 生成 VSIX。

**作者与反馈：** Simon Gu · `simon.gu@mullenlowe.com`

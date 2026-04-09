# Footnote Highlight (VS Code Extension)

一个用于 **Markdown 脚注**与 **可访问性文本（ARIA/ALT）**快速定位的 VS Code 扩展。

## 功能

### 脚注（Footnotes）

- **Focus 高亮（默认）**：当光标停在 `[^id]` 或 `[^id]:` 上时，仅高亮该脚注的：
  - 所有引用 `[^id]`
  - 定义标签 `[^id]:`
- **侧栏脚注列表**：在左侧活动栏「脚注」容器下展示脚注条目，点击可跳转到对应位置。

### ARIA Labels

- **侧栏列出当前文件全部 `aria-label`**（HTML/JSX 常见写法）。
- 点击条目跳转并选中 `aria-label` 的值。

### Image Alts

- **侧栏列出当前文件全部图片 `alt`**：
  - Markdown：`![alt](url)`
  - HTML/JSX：`<img ... alt=\"...\">` / `alt={'...'}` / `alt={`...`}`（仅字面量）
- 点击条目跳转并选中 alt 文本。

## 使用

安装后，在左侧活动栏会出现「脚注」图标：

- **脚注列表**：展示脚注条目与引用/定义
- **ARIA Labels**：展示 `aria-label` 列表
- **Image Alts**：展示图片 `alt` 列表

右上角支持 **刷新**（命令：`脚注: 刷新`）。

## 配置

在设置中搜索 `Footnote Highlight`：

- `footnoteHighlight.enabled`：是否启用
- `footnoteHighlight.mode`：
  - `focus`：光标命中脚注时，仅高亮该组
  - `all`：高亮全文所有脚注引用/定义标签

## 开发

```bash
npm install
npm run watch
```

在 VS Code 中按 `F5` 运行「Extension Development Host」进行调试。

## 打包（VSIX）

```bash
npm run package
```

生成的 `.vsix` 可通过 VS Code/Cursor 的 “Install from VSIX…” 安装。


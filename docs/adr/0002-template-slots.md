# ADR-0002：基于 `data-news-slot` 的 HTML 模板槽位机制

- 状态：已接受（门禁交互载体经 ADR-0003 修正；封面槽位行为已更新为「不嵌入正文、仅提供下载链接」）
- 日期：2026-10-09

## 背景

成稿需要填入 OpenAN 官网新闻页模板（`project-openan.github.io/news/template.html`，深色主题，含导航、面包屑、pills、section 卡片等固定结构）。模板随官网演进，生成器需要一种低耦合、低改造成本的填充机制。

## 决策

在模板 HTML 上用声明式属性标记槽位，填充时用 `DOMParser` 解析为 DOM、按槽位注入内容、再序列化导出。已接入的槽位：

| 槽位 | 选择器 | 填充内容 |
| --- | --- | --- |
| 文档标题 | `<title>` | `News — {title} \| OpenAN` |
| meta 描述 | `meta[name="description"]` | 一句话摘要（供搜索引擎） |
| 面包屑当前页 | `.breadcrumb-current` | 标题纯文本 |
| 主标题 | `[data-news-slot="title"]`（h1） | 标题纯文本 |
| 日期行 | `[data-news-slot="date"]`（.subtitle） | `News · {Month DD, YYYY} · by OpenAN` |
| 分类与标签 | `[data-news-slot="pills"]` | category-pill（含 release/announcement/event/community 修饰类）+ news-tag |
| 正文 | `[data-news-slot="body"]` | 单个 `.section` 卡片：契约约定 `sections` 仅一个元素、`heading` 为空（不渲染 h2），正文为单个 `<p>` 段落（内联仅限 `<strong>` / `<code>` / `<a>`） |
| 封面 | `[data-news-slot="cover"]`（img.arch-image） | 有封面时把 `<img>` 整体替换为下载链接 `<a download>`（href 为 data URL，文件名 `YYYY-MM-DD-slug-cover.ext`）；无封面时移除该元素，封面不嵌入正文 |

相比字符串模板（`{{title}}`），DOM 方式天然处理 HTML 转义与元素级替换（如封面槽位整体换成下载链接）；模板改造只需加几个属性。

## 配套约定

- 文本扩写使用 `response_format: { type: "json_object" }`，模型返回 `{title, summary, category, tags, sections[]}`，避免脆弱的 Markdown 正则解析；类别枚举（Release / Announcement / Event / Community / News）与「单 section、单 `<p>` 段落」由 Prompt 契约约束，客户端用 `normalizeArticle` 做结构归一化（`category` 非字符串时缺省为 News；`tags` 仅保留字符串项且至多 3 个；`heading` 一律置空；无有效 section 时判为解析失败）。
- 「必须原封不动保留」的内容在 Prompt 层强约束，并在客户端用 `findMissingVerbatim` 校验（比对剥标签后的纯文本与原始 HTML 两路）：缺失时编辑栏红色警示，并禁用预览栏的复制/下载按钮直至补回（门禁载体经 ADR-0003 修正，原为「通过」按钮）。
- 导出文件保留 `../components/navbar.css`、`styles.css` 等站点相对路径，直接放入官网仓库 `news/` 目录即可生效；封面不嵌入正文，版面提供 data URL 下载链接，单文件仍自包含。
- 应用内预览（`buildPreviewHtml`）将 `news-styles.css` 内联进 iframe，并剔除导航的相对路径资源（`navbar.css` / `navbar.js`），实现不依赖站点目录资源的预览。
- 文件名遵循站点既有惯例 `YYYY-MM-DD-slug.html`（`suggestFilename`）。
- 模板新增封面槽位（`img.arch-image`）是对官网模板唯一的新增元素：原模板正文无封面位，生成器约定在 `.page-head` 之后插入；官网不需要时可手动删除。

## 后果

- 换模板成本低：任何新模板只需按上表加 `data-news-slot` 属性即可接入。
- 发布流程仍有一步人工操作：按模板 TODO(5/5) 在 `news.html` 列表页顶部追加新闻卡片（导出提示中已注明）。

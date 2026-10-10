# OpenAN 新闻生成台（News Generator）

为 OpenAN 官网新闻页快速产出成稿的**纯前端单页应用**：输入概要（标题可选；概要中英文均可，成稿为英文），大模型扩写为结构化新闻稿，经在线编辑、配图后，一键导出可直接放入官网仓库 `news/` 目录的 HTML 文件。

无后端、无账号体系，构建产物为纯静态文件，任意静态托管即可使用（见 [ADR-0001](./docs/adr/0001-spa-byok.md)）。

## 功能流程

三栏工作台（见 [ADR-0003](./docs/adr/0003-workbench-readiness.md)），所有内容同屏、同时可修改：

```text
┌────────────┬──────────────────────┬────────────────────┐
│ ① 素材输入  │ ② 稿件编辑 + 封面      │ ③ HTML 实时预览      │
│ 标题/概要/  │ 在线编辑（流式生成时    │ iframe 内联样式，     │
│ 必保留原文/ │ 切换为原文视图）；      │ 防抖 300ms 跟随编辑； │
│ 篇幅        │ 封面 AI 生成/上传/移除  │ 复制 / 下载 HTML     │
└────────────┴──────────────────────┴────────────────────┘
```

- 就绪度驱动（素材已填 / 稿件已生成 / 标题就绪 / 封面已就位 / 可导出），无线性步骤、无面板互斥
- 封面 AI 生成以「标题就绪」为硬前置、且需已配置图像模型，始终手动触发
- 缺失「必保留原文」阻断导出；已有稿件时重新生成先弹覆盖确认
- 内置深浅色主题切换（默认跟随系统，选择持久化于 localStorage）

- **BYOK**：模型配置（baseURL / API Key / 文本模型 / 图像模型）通过项目根目录 `.env` 配置（`VITE_API_BASE_URL` / `VITE_API_KEY` / `VITE_CHAT_MODEL` / `VITE_IMAGE_MODEL`），构建时注入前端产物；仓库不内置任何密钥，Key 不写入导出文件或日志
- **结构化生成**：`response_format: json_object` 返回 `{title, summary, category, tags, sections[]}`，客户端 `normalizeArticle` 归一化校验，避免脆弱的 Markdown 解析
- **原文保护**：「必须原封不动保留」的段落在导出前由 `findMissingVerbatim` 校验，缺失即阻断
- **模板槽位**：基于 `data-news-slot` 声明式属性把成稿注入官网新闻模板（`DOMParser` → 注入 → 序列化），换模板只需在 HTML 上加属性（见 [ADR-0002](./docs/adr/0002-template-slots.md)）
- **封面不嵌入正文**：版面仅提供封面图片的下载链接（href 为 data URL，导出文件单文件自包含）

## 技术栈

React 18 · TypeScript · Vite 5 · Zustand · Tailwind CSS · Radix UI（Dialog）· lucide-react

模型调用为约 200 行自研 `fetch` 封装（`{baseURL}/chat/completions` SSE 流式 + `{baseURL}/images/generations`，baseURL 通常以 `/v1` 结尾），兼容 OpenAI 接口，未引入官方 SDK。图像端点按公司网关要求发送对话式请求体，兼容模型直接返回 SVG 代码并由客户端提取转为 data URL。

## 快速开始

要求 Node >= 18。

```bash
npm install
npm run dev      # 启动 Vite 开发服务器（默认 http://localhost:5174）
npm run build    # 类型检查 + 构建（产物在 dist/）
npm run preview  # 本地预览构建产物
```

首次使用前在项目根目录创建 `.env` 配置模型接入（修改后需重启 `npm run dev` 生效；生产部署需重新构建）：

```bash
VITE_API_BASE_URL=   # OpenAI 兼容接口地址，通常以 /v1 结尾
VITE_API_KEY=        # API Key（会被内联进构建产物，请自行构建、自行使用）
VITE_CHAT_MODEL=     # 文本模型，生成稿件必需
VITE_IMAGE_MODEL=    # 图像模型，可选；未配置时 AI 绘封不可用，手动上传封面不受影响
```

配置不完整时顶栏会显示「配置不完整」，生成入口将被拦截并提示。

## 使用说明

1. **填写素材**（左栏）：标题（可留空由 AI 拟定）、概要（必填，中英文均可，成稿为英文）、可选「必须保留的原文」（如版本号、官方表述）、篇幅（短稿：标准化复述概要、不虚构细节；长稿：120–220 词英文完整公告）。
2. **生成与编辑**（中栏）：流式生成完成后直接在工作台编辑标题、摘要、分类、标签与正文 HTML；不满意可附「重生成意见」重新生成（按最近一次提交的素材快照重写；已有稿件时会先弹覆盖确认）。
3. **封面**（中栏）：标题就绪后可让模型按标题绘制封面（白底 + 海军蓝标题的 SVG 排版图，需配置 `VITE_IMAGE_MODEL`），或拖拽/点击上传，也可移除（导出时封面不嵌入正文，仅提供下载链接；无封面则移除该元素）。
4. **预览与导出**（右栏）：版面随编辑防抖实时刷新；「可导出」（无必保留原文缺失）后复制或下载 HTML，放入官网仓库 `news/` 目录；最后按模板提示在 `news.html` 列表页顶部追加新闻卡片（唯一的一步人工操作）。

> 已知限制：个别模型厂商接口禁止浏览器跨域（CORS），表现为请求抛 `TypeError`。开发服务器已内置 `/gateway` 反向代理：在 `.env` 中以 `VITE_GATEWAY_TARGET` 指定上游、将 `VITE_API_BASE_URL` 填为 `/gateway/v1` 即可绕过；生产环境可另行追加约 20 行的 Node / Cloudflare Worker 代理，主体架构零改动（见 ADR-0001）。

## 项目结构

```text
openan-news-generator/
├── src/
│   ├── components/          # TopBar / InputForm / ArticleEditor / CoverPanel
│   │                        # PreviewPanel / OverwriteDialog / Toasts + ui/
│   ├── lib/
│   │   ├── openai-client.ts     # OpenAI 兼容接口 fetch 封装（SSE 流式 + 图像）
│   │   ├── prompts.ts           # 文章扩写 / 封面提示词（封面 SVG 版面预计算）
│   │   ├── template-engine.ts   # JSON 抽取、结构归一化、verbatim 校验、模板槽位填充
│   │   ├── useTheme.ts          # 深浅色主题（localStorage 持久化）
│   │   └── utils.ts
│   ├── stores/workflow.ts   # Zustand 工作台状态（就绪度派生，无线性步骤）
│   ├── templates/           # news-template.html（官网新闻模板）+ news-styles.css
│   └── types/
├── docs/                    # adr/（0001 纯前端 SPA + BYOK；0002 模板槽位机制；0003 三栏工作台与就绪度）+ glossary.md
├── vite.config.ts           # 开发服务器（端口 5174）与 /gateway 代理（VITE_GATEWAY_TARGET）
└── dist/                    # 构建产物
```

## 文档

| 文档 | 内容 |
| --- | --- |
| [docs/adr/0001-spa-byok.md](./docs/adr/0001-spa-byok.md) | 为什么是纯前端 SPA + BYOK（含被否决方案与 CORS 退路） |
| [docs/adr/0002-template-slots.md](./docs/adr/0002-template-slots.md) | `data-news-slot` 模板槽位机制、导出约定与发布流程 |
| [docs/adr/0003-workbench-readiness.md](./docs/adr/0003-workbench-readiness.md) | 三栏工作台与就绪度模型（取代线性步骤状态机） |
| [docs/glossary.md](./docs/glossary.md) | 术语表 |

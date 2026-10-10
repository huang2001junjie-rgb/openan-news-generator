# 术语表

| 术语 | 含义 |
| --- | --- |
| BYOK | Bring Your Own Key。每位使用者在项目根目录 `.env` 中配置大模型的 baseURL / API Key / 模型名（`VITE_API_BASE_URL` / `VITE_API_KEY` / `VITE_CHAT_MODEL` / `VITE_IMAGE_MODEL`），构建时注入前端产物；仓库不内置任何账号与密钥。 |
| OpenAI 兼容接口 | 遵循 OpenAI REST 形态的接口：`POST {baseURL}/chat/completions`（文本，支持 SSE 流式）与 `POST {baseURL}/images/generations`（图像），baseURL 通常以 `/v1` 结尾。国内主流模型厂商普遍提供该兼容形式。 |
| 槽位（slot） | 模板 HTML 上用 `data-news-slot` 属性标记的可填充位置，共五个：`title`、`date`、`pills`、`body`、`cover`。详见 ADR-0002。 |
| 短稿 / 长稿 | 两档成稿长度。短稿：用标准化新闻语言复述概要、不虚构细节；长稿：120–220 词英文完整新闻公告。 |
| 原文保留（verbatim） | 用户标记的必须逐字出现在成稿中的文本片段（版本号、命令、专有名词等）。Prompt 层强约束 + 客户端 `findMissingVerbatim` 校验（比对剥标签后的纯文本与原始 HTML）双重保障。 |
| 工作台 | 取代旧线性步骤流程的三栏常驻界面：素材输入 ∥ 稿件编辑+封面 ∥ HTML 实时预览，所有内容同时可见、同时可修改。详见 ADR-0003。（旧术语「工作流步骤」已废弃） |
| 就绪度 | 由数据事实派生、不单独存储的状态：素材已填 / 稿件已生成 / 标题就绪 / 封面已就位 / 可导出。前四项以 TopBar 徽标呈现，「标题就绪」驱动封面按钮禁用，取代旧的步骤状态机。 |
| 标题就绪 | `article` 存在且 `title` 非空（AI 生成或手动填写均算）。「AI 生成封面」的硬前置条件；封面始终手动触发，不随稿件生成自动绘制。 |
| 可导出 | 导出（复制/下载 HTML）的唯一门禁：稿件已生成且无「必须原文保留」缺失。缺失 verbatim 阻断导出（沿袭 ADR-0002）。 |
| 自包含导出 | 导出的单 HTML 文件不内嵌封面位图，而是把封面槽位替换为 data URL 下载链接（文件名 `YYYY-MM-DD-slug-cover.ext`），单文件仍自包含；样式与导航沿用官网相对路径，放入官网仓库 `news/` 目录即可发布。 |
| 模型调用层 | `src/lib/openai-client.ts`：约 200 行的 fetch 封装，含超时（文本 60s / 图像 120s）、AbortController 取消、SSE 坏行容错（跳过坏行不中断流）与错误分类（CORS / 鉴权 / 限流 / 5xx / 网络 / 响应格式 / 取消）。图像生成按网关要求发送对话式请求体，兼容模型以 SVG 代码返回图片，提取后转为 data URL。 |

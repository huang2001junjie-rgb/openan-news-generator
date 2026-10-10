# ADR-0001：纯前端 SPA + BYOK 直连大模型

- 状态：已接受
- 日期：2026-10-09

## 背景

新闻生成器的使用者是 OpenAN 项目成员，每人持有自己的大模型账号（OpenAI 兼容接口）。核心诉求是「轻量化」与「可轻松分发给同事使用」。

## 决策

采用纯前端单页应用（SPA），无后端、无账号体系：

- 构建产物为纯静态文件（gzip 后约 95KB），任意静态托管即可使用，分发成本最低；默认产物以绝对路径 `/assets/…` 引用资源，如需直接双击 `index.html` 打开，须改用相对 base 重新打包。
- 模型配置（baseURL / API Key / 文本模型 / 图像模型）由每位使用者在项目根目录 `.env` 中配置（`VITE_API_BASE_URL` / `VITE_API_KEY` / `VITE_CHAT_MODEL` / `VITE_IMAGE_MODEL`），构建时注入（BYOK）；应用内无设置界面，配置不完整时 TopBar 显示「配置不完整」并拦截生成。图像模型为可选项，仅影响 AI 绘封。
- 浏览器通过自研约 200 行的 fetch 封装直连大模型的 `{baseURL}/chat/completions`（SSE 流式）与 `{baseURL}/images/generations` 两个端点（baseURL 通常以 `/v1` 结尾），不引入官方 SDK（浏览器端用不到其大部分能力，且增加约 500KB 体积）。图像端点按公司网关要求发送对话式请求体（`messages` + `reasoning_effort: 'low'`），兼容模型直接返回 SVG 代码，由客户端提取转为 data URL。
- API Key 仅随运行时请求发往用户自配的 baseURL，绝不写入导出文件或日志；但会随 `.env` 在构建时内联进前端产物，产物的分发范围即 Key 的暴露范围，应自行构建、自行使用。

## 已否决的备选

| 方案 | 否决原因 |
| --- | --- |
| 前后端分离（Node 代理） | 同事需装 Node 环境并启动服务，分发变重；本应用没有必须放在服务端的状态 |
| 桌面应用（Tauri/Electron） | 构建、签名、分发链路最重，与轻量化目标相悖 |
| 引入 `openai` 官方 SDK | 体积大、浏览器端能力冗余；两个端点用 fetch 即可覆盖 |

## 后果

- 优点：零后端、零运维、零账号；静态托管即用；Key 仅发往自配 baseURL。
- 已知风险：个别厂商接口禁止浏览器跨域（CORS），表现为 fetch 抛出 `TypeError`。
- 退路：模型调用层的 baseURL 为抽象配置项，支持填写相对路径。开发服务器已内置 `/gateway` 反向代理（`.env` 的 `VITE_GATEWAY_TARGET` 指定上游，`secure: false` 放行自签证书），遇 CORS 时把 `VITE_API_BASE_URL` 填为 `/gateway/v1` 即可；生产环境可另行追加约 20 行的 Node / Cloudflare Worker 代理转发请求，主体架构零改动。

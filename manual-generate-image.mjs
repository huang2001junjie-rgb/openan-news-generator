// 手动验证新版 generateImage 的请求方式：
// POST {baseURL}/images/generations（浏览器同款代理路径 -> https://st8tp3ajl0df3n8b8l8qu.apigateway-cn-beijing.volceapi.com/v1/images/generations）
// 请求体为对话式（网关后端按 ChatCompletionRequest 解析），提取 SVG 并保存到项目根目录
import { writeFileSync } from 'node:fs'

const PROXY = 'http://localhost:5174/gateway/v1'
const DIRECT = 'https://st8tp3ajl0df3n8b8l8qu.apigateway-cn-beijing.volceapi.com/v1'
const API_KEY = '83f84283-9977-4a00-b839-75e626abd0f8'
const MODEL = 'glm-5.3-flash'

// 与新版 buildCoverPrompt 一致（纯白底 + 海军蓝标题；折行/字号为前端预计算结果）
const prompt = [
  'Task: produce the cover image of a technology news article as an SVG file.',
  'Design (strict): a pure white background (#FFFFFF) plus the article title rendered in navy blue (#1A3A8F). Nothing else — no illustration, no icons, no geometric shapes, no lines, no gradients, no patterns, no frame, no border, no shadow, no logo, no watermark, no decorative element, and no text other than the title.',
  'Article title (must appear character-for-character, already XML-escaped for you): "OpenAN SDK 2.0 Released"',
  'Return EXACTLY the following SVG markup, byte for byte. Line breaking, font size and coordinates are pre-computed — keep all 1 <tspan> lines, every attribute and every number unchanged:',
  '<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" width="1280" height="720">',
  '  <rect x="0" y="0" width="1280" height="720" fill="#FFFFFF"/>',
  '  <text x="640" y="385" text-anchor="middle" font-family="\'Helvetica Neue\', Helvetica, Arial, \'PingFang SC\', \'Microsoft YaHei\', sans-serif" font-size="72" font-weight="700" fill="#1A3A8F">',
  '    <tspan x="640" y="385">OpenAN SDK 2.0 Released</tspan>',
  '  </text>',
  '</svg>',
  'Output contract: return ONLY that one raw <svg> element. No markdown fences, no comments, no explanation. Do not use <style>, @font-face, <foreignObject>, filters, scripts or external references — the SVG is rendered from a data URL inside an <img>, where those do not work.',
].join('\n')

async function post(base) {
  const t0 = Date.now()
  const res = await fetch(`${base}/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      reasoning_effort: 'low',
    }),
    signal: AbortSignal.timeout(120_000),
  })
  const text = await res.text()
  console.log(`[${base.includes('localhost') ? '代理' : '直连'}] HTTP ${res.status}，耗时 ${Date.now() - t0}ms`)
  if (!res.ok) throw new Error(text.slice(0, 300))
  return JSON.parse(text)
}

let payload
try {
  payload = await post(PROXY)
} catch (err) {
  console.log(`代理失败（${err.message}），改直连`)
  payload = await post(DIRECT)
}

const content = payload.choices?.[0]?.message?.content ?? ''
console.log(`finish_reason=${payload.choices?.[0]?.finish_reason}，content 长度=${content.length}`)

// 与新版 extractImageFromContent 的 SVG 分支一致
const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/)
if (!svgMatch) {
  console.error('响应中未找到 SVG')
  console.log(content.slice(0, 500))
  process.exit(2)
}
const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMatch[0])}`
writeFileSync(new URL('./manual-test-cover.svg', import.meta.url), svgMatch[0])
writeFileSync(new URL('./manual-test-cover-dataurl.txt', import.meta.url), dataUrl)
console.log(`[已保存] manual-test-cover.svg (${svgMatch[0].length} bytes)`)
console.log(`[已保存] manual-test-cover-dataurl.txt (data URL, ${dataUrl.length} bytes，前端 coverDataUrl 即此格式)`)

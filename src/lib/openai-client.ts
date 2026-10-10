import type { ApiErrorKind, ModelConfig } from '../types'

export class ApiError extends Error {
  kind: ApiErrorKind
  hint: string

  constructor(kind: ApiErrorKind, message: string, hint: string) {
    super(message)
    this.kind = kind
    this.hint = hint
  }
}

const HINTS: Record<ApiErrorKind, string> = {
  cors: '浏览器被目标接口拒绝跨域访问（CORS）。请确认该厂商支持浏览器直连，或改用允许跨域的网关地址。',
  auth: '鉴权失败（401/403）。请检查 API Key 是否正确、是否已过期。',
  ratelimit: '触发限流（429）。请稍后重试，或检查账户额度。',
  server: '模型服务端错误（5xx）。请稍后重试。',
  network: '网络请求失败。请检查 baseURL 是否可访问、是否需 HTTPS。',
  bad_response: '接口返回格式不符合 OpenAI 兼容规范。请确认 baseURL 与模型名无误。',
  aborted: '请求已取消。',
}

function classify(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  const e = err as { name?: string; message?: string }
  if (e?.name === 'AbortError') return new ApiError('aborted', '请求已取消', HINTS.aborted)
  if (e?.name === 'TimeoutError') return new ApiError('network', '请求超时（60s）', HINTS.network)
  // fetch 的网络层/CORS 失败在浏览器中表现为 TypeError
  return new ApiError('cors', e?.message || '网络或跨域错误', HINTS.cors)
}

function statusError(status: number, body: string): ApiError {
  const short = body.slice(0, 200)
  if (status === 401 || status === 403) return new ApiError('auth', `HTTP ${status}: ${short}`, HINTS.auth)
  if (status === 429) return new ApiError('ratelimit', `HTTP 429: ${short}`, HINTS.ratelimit)
  if (status >= 500) return new ApiError('server', `HTTP ${status}: ${short}`, HINTS.server)
  return new ApiError('bad_response', `HTTP ${status}: ${short}`, HINTS.bad_response)
}

function joinURL(baseURL: string, path: string): string {
  const base = baseURL.trim().replace(/\/+$/, '')
  return `${base}${path}`
}

function linkSignal(signal: AbortSignal | undefined, controller: AbortController): void {
  if (!signal) return
  if (signal.aborted) controller.abort(signal.reason)
  else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
}

/** 容错解析单行 SSE 数据：坏行记录日志并跳过，不中断整次流式生成 */
function parseDelta(payload: string): string {
  let parsed: { choices?: Array<{ delta?: { content?: string } }> } | null = null
  try {
    parsed = JSON.parse(payload)
  } catch (err) {
    console.error('SSE 行解析失败，已跳过', err)
  }
  return parsed?.choices?.[0]?.delta?.content ?? ''
}

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export interface OpenAIClient {
  chatStream(messages: ChatMessage[], onDelta: (text: string) => void, signal?: AbortSignal): Promise<string>
  generateImage(prompt: string, signal?: AbortSignal): Promise<string>
  testConnection(): Promise<boolean>
}

export function createClient(config: ModelConfig): OpenAIClient {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }

  async function request(path: string, body: unknown, timeoutMs: number, signal?: AbortSignal): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs)
    linkSignal(signal, controller)
    const res = await fetch(joinURL(config.baseURL, path), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    }).catch((err: unknown) => Promise.reject(classify(err)))
    clearTimeout(timer)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw statusError(res.status, text)
    }
    return res
  }

  async function chatStream(
    messages: ChatMessage[],
    onDelta: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const res = await request(
      '/chat/completions',
      {
        model: config.chatModel,
        messages,
        stream: true,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      },
      60_000,
      signal,
    )
    const reader = res.body?.getReader()
    if (!reader) throw new ApiError('bad_response', '响应无可读流', HINTS.bad_response)

    const decoder = new TextDecoder()
    let buffer = ''
    let full = ''

    const pump = async (): Promise<string> => {
      const { done, value } = await reader.read()
      if (done) return full
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') return full
        const delta = parseDelta(payload)
        if (delta) {
          full += delta
          onDelta(delta)
        }
      }
      return pump()
    }

    return pump().catch((err: unknown) => Promise.reject(classify(err)))
  }

  /** 从多模态对话响应中提取图片：兼容 content 数组、Markdown 图片、data URL、SVG 代码、裸图片链接 */
  function extractImageFromContent(content: unknown): string | null {
    if (Array.isArray(content)) {
      for (const part of content as Array<Record<string, unknown>>) {
        const url = (part?.image_url as { url?: string } | undefined)?.url
        if (typeof url === 'string' && url) return url
        const b64 = (part?.image as { b64_json?: string } | undefined)?.b64_json
        if (typeof b64 === 'string' && b64) return `data:image/png;base64,${b64}`
      }
      return null
    }
    if (typeof content === 'string') {
      const md = content.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/)
      if (md) return md[1]
      const dataUrl = content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/)
      if (dataUrl) return dataUrl[0]
      const svg = content.match(/<svg[\s\S]*?<\/svg>/)
      if (svg) return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg[0])}`
      const raw = content.match(/https?:\/\/[^\s)"']+\.(?:png|jpe?g|webp|gif)[^\s)"']*/i)
      if (raw) return raw[0]
    }
    return null
  }

  async function generateImage(prompt: string, signal?: AbortSignal): Promise<string> {
    // 公司网关将文生图挂在 /images/generations，但其后端按 ChatCompletionRequest 解析
    // （标准 prompt 字段报 400「输入不能为空」/「missing messages」），故必须发对话式请求体；
    // 图像模型缺位时由始终思考的文本模型以 SVG 代码形式返回图片，
    // reasoning_effort:'low' 限制思考预算（实测不加时绘图 prompt 会陷入超长推理直至超时），
    // 最终由 extractImageFromContent 提取 SVG 并转为 data URL
    const res = await request(
      '/images/generations',
      {
        model: config.imageModel,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        reasoning_effort: 'low',
      },
      120_000,
      signal,
    )
    const payload = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>
      choices?: Array<{ message?: { content?: unknown } }>
    }
    let found: string | null = null
    const item = payload.data?.[0]
    if (item?.b64_json) found = `data:image/png;base64,${item.b64_json}`
    else if (item?.url) found = item.url
    else found = extractImageFromContent(payload.choices?.[0]?.message?.content)
    if (!found) throw new ApiError('bad_response', '响应中未找到图片（URL 或 base64）', HINTS.bad_response)
    if (found.startsWith('data:')) return found
    const imgRes = await fetch(found).catch((err: unknown) => Promise.reject(classify(err)))
    const blob = await imgRes.blob()
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new ApiError('bad_response', '封面图转码失败', HINTS.bad_response))
      reader.readAsDataURL(blob)
    })
  }

  async function testConnection(): Promise<boolean> {
    const res = await fetch(joinURL(config.baseURL, '/models'), {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    }).catch((err: unknown) => Promise.reject(classify(err)))
    if (!res.ok) throw statusError(res.status, '')
    return true
  }

  return { chatStream, generateImage, testConnection }
}

export function isConfigComplete(config: ModelConfig): boolean {
  return Boolean(config.baseURL.trim() && config.apiKey.trim() && config.chatModel.trim())
}

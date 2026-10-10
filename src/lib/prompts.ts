import type { NewsInput } from '../types'

const JSON_CONTRACT = `{
  "title": "string — 新闻标题，简洁有力，不超过 60 个字符",
  "summary": "string — 一句话摘要（供搜索引擎 meta description），不超过 120 个字符",
  "category": "string — 必须是 Release / Announcement / Event / Community / News 之一",
  "tags": ["string — 1 到 3 个英文标签，如 SDK、Workflow、A2A-T"],
  "sections": [
    {
      "heading": "string — 必须为空字符串，文章不含任何小节标题",
      "html": "string — 小节正文 HTML，整篇必须是单个 <p> 段落（只用一个 <p>，不要多段、不要 <ul>/<ol>/<li> 列表），段内可用 <strong> <code> <a> 标签；链接必须带 target=\\"_blank\\" rel=\\"noopener\\""
    }
  ]
}`

const SYSTEM_BASE = `You are a professional technology news editor for the OpenAN open-source project website (project-openan.github.io).
You write clear, factual, well-structured news articles in English, in the style of project release notes and community announcements.
You MUST respond with a single valid JSON object matching this contract (no markdown fences, no extra text):
${JSON_CONTRACT}`

export function buildArticleMessages(
  input: NewsInput,
  today: string,
  extraInstruction?: string,
): Array<{ role: 'system' | 'user'; content: string }> {
  const lengthSpec =
    input.length === 'short'
      ? 'LENGTH: SHORT — restate the outline in standardized news language; do not invent details.'
      : 'LENGTH: LONG — a concise announcement of 120–220 English words.'

  const titleSpec = input.title.trim()
    ? `TITLE: The user provided this exact title — use it verbatim for "title": "${input.title.trim()}"`
    : 'TITLE: Compose an appropriate headline for "title".'

  const verbatimSpec =
    input.verbatim.length > 0
      ? `VERBATIM CONSTRAINT (highest priority): the following text fragments MUST appear character-for-character, exactly as given, somewhere in the section HTML bodies. Do not translate, rephrase, or alter punctuation:
${input.verbatim.map((v, i) => `  ${i + 1}. """${v}"""`).join('\n')}`
      : ''

  const extraSpec = extraInstruction?.trim() ? `ADDITIONAL INSTRUCTION: ${extraInstruction.trim()}` : ''

  const user = [
    `Today is ${today}.`,
    lengthSpec,
    'STRUCTURE (mandatory): return EXACTLY ONE element in "sections". Its "html" MUST be a single <p> element — one continuous paragraph. Do NOT split the body into multiple <p> tags and do NOT use <ul>, <ol>, or <li> lists. Inline <strong>, <code>, and <a> are still allowed inside that one paragraph. Set "heading" to an empty string — the article must NOT contain any section heading.',
    titleSpec,
    verbatimSpec,
    extraSpec,
    `OUTLINE (source material, may be in Chinese — always write the article in English):\n"""${input.outline.trim()}"""`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return [
    { role: 'system', content: SYSTEM_BASE },
    { role: 'user', content: user },
  ]
}

/** 封面配色：纯白底 + 海军蓝标题（与站点品牌深色一致） */
const COVER_BG = '#FFFFFF'
const COVER_TITLE_COLOR = '#1A3A8F'
const COVER_FONT_STACK =
  "'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"
const COVER_W = 1280
const COVER_H = 720

/** SVG 文本必须转义，否则整张 data URL 图片渲染失败 */
function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isCjk(ch: string): boolean {
  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/.test(ch)
}

/** 宽度权重：CJK 记 2，其余记 1（约等于半角/全角字符数） */
function textWidth(text: string): number {
  return [...text].reduce((sum, ch) => sum + (isCjk(ch) ? 2 : 1), 0)
}

/** 超出单行容量的长词硬切：CJK 逐字可断，拉丁词仅在实在放不下时断开 */
function hardSplit(word: string, capacity: number): string[] {
  if (textWidth(word) <= capacity) return [word]
  const pieces: string[] = []
  let piece = ''
  for (const ch of word) {
    if (piece && textWidth(piece) + (isCjk(ch) ? 2 : 1) > capacity) {
      pieces.push(piece)
      piece = ''
    }
    piece += ch
  }
  if (piece) pieces.push(piece)
  return pieces
}

type Chunk = { text: string; glue: ' ' | '' }

/** 拆成可折行片段：跨词用空格粘连，CJK 相邻处不加空格，硬切片段不加分隔 */
function chunkify(text: string, capacity: number): Chunk[] {
  const chunks: Chunk[] = []
  for (const word of text.split(/\s+/).filter(Boolean)) {
    hardSplit(word, capacity).forEach((piece, index) => {
      const prev = chunks[chunks.length - 1]
      const prevTail = prev ? [...prev.text].pop() ?? '' : ''
      const cjkSeam = isCjk(piece[0] ?? '') || isCjk(prevTail)
      chunks.push({ text: piece, glue: prev && index === 0 && !cjkSeam ? ' ' : '' })
    })
  }
  return chunks
}

function wrapChunks(chunks: Chunk[], capacity: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const { text, glue } of chunks) {
    if (line && textWidth(line + glue + text) > capacity) {
      lines.push(line)
      line = text
    } else {
      line += glue + text
    }
  }
  if (line) lines.push(line)
  return lines
}

/** 行数越多字号越小；capacity 已按「0.62 × 字号 × 权重」留出左右各约 96px 边距 */
const COVER_LAYOUTS = [
  { maxLines: 1, fontSize: 72, capacity: 24 },
  { maxLines: 2, fontSize: 62, capacity: 28 },
  { maxLines: 3, fontSize: 52, capacity: 33 },
  { maxLines: 4, fontSize: 44, capacity: 39 },
]

/** 预先算好标题折行与字号，避免模型自行排版导致溢出画布 */
function layoutCoverTitle(title: string): { lines: string[]; fontSize: number; lineHeight: number; startY: number } {
  const text = title.trim().replace(/\s+/g, ' ') || 'Untitled'
  const fallback = COVER_LAYOUTS[COVER_LAYOUTS.length - 1]
  let chosen = fallback
  let lines = wrapChunks(chunkify(text, fallback.capacity), fallback.capacity)
  for (const layout of COVER_LAYOUTS) {
    const candidate = wrapChunks(chunkify(text, layout.capacity), layout.capacity)
    if (candidate.length <= layout.maxLines) {
      chosen = layout
      lines = candidate
      break
    }
  }
  const fontSize = chosen.fontSize
  const lineHeight = Math.round(fontSize * 1.3)
  // 首行基线：让整块文本在画布垂直居中（基线约在字身下方 0.35em）
  const startY = Math.round(COVER_H / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35)
  return { lines, fontSize, lineHeight, startY }
}

/** 封面：纯白背景 + 海军蓝标题，其余元素一律不要 */
export function buildCoverPrompt(title: string): string {
  const { lines, fontSize, lineHeight, startY } = layoutCoverTitle(title)
  const tspans = lines
    .map(
      (line, i) =>
        `    <tspan x="${COVER_W / 2}" y="${startY + i * lineHeight}">${escapeXmlText(line)}</tspan>`,
    )
    .join('\n')
  const skeleton = [
    `<svg viewBox="0 0 ${COVER_W} ${COVER_H}" xmlns="http://www.w3.org/2000/svg" width="${COVER_W}" height="${COVER_H}">`,
    `  <rect x="0" y="0" width="${COVER_W}" height="${COVER_H}" fill="${COVER_BG}"/>`,
    `  <text x="${COVER_W / 2}" y="${startY}" text-anchor="middle" font-family="${COVER_FONT_STACK}" font-size="${fontSize}" font-weight="700" fill="${COVER_TITLE_COLOR}">`,
    tspans,
    '  </text>',
    '</svg>',
  ].join('\n')

  return [
    'Task: produce the cover image of a technology news article as an SVG file.',
    `Design (strict): a pure white background (${COVER_BG}) plus the article title rendered in navy blue (${COVER_TITLE_COLOR}). Nothing else — no illustration, no icons, no geometric shapes, no lines, no gradients, no patterns, no frame, no border, no shadow, no logo, no watermark, no decorative element, and no text other than the title.`,
    `Article title (must appear character-for-character, already XML-escaped for you): "${escapeXmlText(title.trim())}"`,
    `Return EXACTLY the following SVG markup, byte for byte. Line breaking, font size and coordinates are pre-computed — keep all ${lines.length} <tspan> lines, every attribute and every number unchanged:`,
    skeleton,
    'Output contract: return ONLY that one raw <svg> element. No markdown fences, no comments, no explanation. Do not use <style>, @font-face, <foreignObject>, filters, scripts or external references — the SVG is rendered from a data URL inside an <img>, where those do not work.',
  ].join('\n')
}

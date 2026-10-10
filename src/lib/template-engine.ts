import type { GeneratedArticle } from '../types'

/** 类别 pill 与 styles.css 中的修饰类映射 */
const CATEGORY_CLASS: Record<string, string> = {
  Release: 'release',
  Announcement: 'announcement',
  Event: 'event',
  Community: 'community',
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(text: string): string {
  return escapeHtml(text).replace(/'/g, '&#39;')
}

function sectionHtml(section: { heading: string; html: string }): string {
  const heading = section.heading.trim() ? `\n  <h2>${escapeHtml(section.heading.trim())}</h2>` : ''
  return `<div class="section">${heading}\n  ${section.html}\n</div>`
}

function pillsHtml(article: GeneratedArticle): string {
  const modifier = CATEGORY_CLASS[article.category] ?? ''
  const cls = modifier ? `category-pill ${modifier}` : 'category-pill'
  const category = `<span class="${cls}">${escapeHtml(article.category)}</span>`
  const tags = article.tags
    .map((t) => `<span class="news-tag">${escapeHtml(t)}</span>`)
    .join('\n      ')
  return `${category}\n      ${tags}`
}

/** 将生成内容按 data-news-slot 槽位注入模板，返回完整 HTML 字符串 */
export function fillTemplate(
  templateHtml: string,
  article: GeneratedArticle,
  coverDataUrl: string | null,
): string {
  const doc = new DOMParser().parseFromString(templateHtml, 'text/html')

  const setText = (selector: string, text: string) => {
    const el = doc.querySelector(selector)
    if (el) el.textContent = text
    else console.error(`模板槽位缺失: ${selector}`)
  }

  const titleEl = doc.querySelector('title')
  if (titleEl) titleEl.textContent = `News — ${article.title} | OpenAN`

  const meta = doc.querySelector('meta[name="description"]')
  if (meta) meta.setAttribute('content', article.summary)

  setText('.breadcrumb-current', article.title)
  setText('[data-news-slot="title"]', article.title)
  setText('[data-news-slot="date"]', `News · ${article.date} · by OpenAN`)

  const pills = doc.querySelector('[data-news-slot="pills"]')
  if (pills) pills.innerHTML = pillsHtml(article)

  const body = doc.querySelector('[data-news-slot="body"]')
  if (body) body.innerHTML = article.sections.map(sectionHtml).join('\n\n  ')

  const cover = doc.querySelector<HTMLImageElement>('[data-news-slot="cover"]')
  if (cover) {
    if (coverDataUrl) {
      // 封面不嵌入正文：槽位替换为封面图片的下载链接（href 为 data URL，单文件仍自包含）
      const mime = coverDataUrl.match(/^data:([^;,]+)/)?.[1] ?? ''
      const ext = mime.includes('svg')
        ? 'svg'
        : mime.includes('png')
          ? 'png'
          : mime.includes('jpeg')
            ? 'jpg'
            : mime.includes('webp')
              ? 'webp'
              : 'img'
      const name = suggestFilename(article.title, article.date).replace(/\.html$/, `-cover.${ext}`)
      const link = doc.createElement('a')
      link.href = coverDataUrl
      link.download = name
      link.textContent = `下载封面图（${name}）`
      link.setAttribute(
        'style',
        'display:inline-block;margin:0 0 20px;padding:8px 14px;border:1px solid rgba(79,195,247,.45);border-radius:8px;color:#4fc3f7;font-size:14px;',
      )
      cover.replaceWith(link)
    } else {
      cover.remove()
    }
  }

  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`
}

/** 生成供 iframe 预览的 HTML：内联新闻样式、剔除站点相对路径资源 */
export function buildPreviewHtml(filledHtml: string, stylesCss: string): string {
  return filledHtml
    .replace('<link rel="stylesheet" href="../components/navbar.css">', '')
    .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${stylesCss}\n</style>`)
    .replace('<script src="../components/navbar.js"></script>', '')
}

/** 按站点既有命名惯例建议文件名：YYYY-MM-DD-slug.html */
export function suggestFilename(title: string, date: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  const iso = toISODate(date)
  return `${iso}-${slug || 'news'}.html`
}

/** "October 9, 2026" → "2026-10-09"；无法解析时回退到当天 */
function toISODate(dateText: string): string {
  const parsed = Date.parse(dateText)
  const d = Number.isNaN(parsed) ? new Date() : new Date(parsed)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function exportAsSingleHtml(filledHtml: string, filename: string): void {
  const blob = new Blob([filledHtml], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** 校验"必须原封不动保留"的片段是否出现在正文中，返回缺失项 */
export function findMissingVerbatim(article: GeneratedArticle, verbatim: string[]): string[] {
  const haystack = article.sections.map((s) => s.html).join('\n')
  const plain = haystack.replace(/<[^>]+>/g, '')
  return verbatim.filter((v) => v.trim() && !plain.includes(v.trim()) && !haystack.includes(v.trim()))
}

/** 从模型输出中提取 JSON（容忍首尾杂质与代码围栏） */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    console.error('模型输出中未找到 JSON 对象', text.slice(0, 300))
    return null
  }
  let parsed: unknown = null
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1))
  } catch (err) {
    console.error('模型输出 JSON 解析失败', err)
  }
  return parsed
}

/** 将模型返回的原始 JSON 归一化为 GeneratedArticle；结构不符返回 null */
export function normalizeArticle(raw: unknown, date: string): GeneratedArticle | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (typeof r.title !== 'string' || typeof r.summary !== 'string') return null
  const sectionsRaw = Array.isArray(r.sections) ? r.sections : []
  const sections = sectionsRaw
    .map((s) => {
      const sec = s as Record<string, unknown>
      return {
        heading: '',
        html: typeof sec.html === 'string' ? sec.html : '',
      }
    })
    .filter((s) => s.html.trim())
  if (!sections.length) return null
  return {
    title: r.title,
    summary: r.summary,
    category: typeof r.category === 'string' ? r.category : 'News',
    tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string').slice(0, 3) : [],
    date,
    sections,
  }
}

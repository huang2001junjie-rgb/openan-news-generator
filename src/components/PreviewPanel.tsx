import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ClipboardCopy, Download, LayoutTemplate } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useWorkflow, selectExportable } from '../stores/workflow'
import { buildPreviewHtml, exportAsSingleHtml, fillTemplate, suggestFilename } from '../lib/template-engine'
import templateHtml from '../templates/news-template.html?raw'
import stylesCss from '../templates/news-styles.css?raw'

/** 预览防抖间隔（ADR-0003：停止输入约 300ms 后刷新 iframe） */
const PREVIEW_DEBOUNCE_MS = 300

/** 工作台第③栏：渲染 HTML 实时预览与导出，常驻可见 */
export function PreviewPanel() {
  const article = useWorkflow((s) => s.article)
  const coverDataUrl = useWorkflow((s) => s.coverDataUrl)
  const missingVerbatim = useWorkflow((s) => s.missingVerbatim)
  const exportable = useWorkflow(selectExportable)
  const toast = useWorkflow((s) => s.toast)
  const [copied, setCopied] = useState(false)
  const [previewSrc, setPreviewSrc] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const savedScroll = useRef(0)

  /** 导出时现算最新 HTML，避免拿到防抖窗口内的旧值 */
  const computeFilled = () => (article ? fillTemplate(templateHtml, article, coverDataUrl) : '')

  // 防抖执行 fillTemplate 并刷新 iframe srcDoc（敲键期间不跑 DOMParser）
  useEffect(() => {
    if (!article) {
      setPreviewSrc('')
      return
    }
    const timer = setTimeout(() => {
      setPreviewSrc(buildPreviewHtml(fillTemplate(templateHtml, article, coverDataUrl), stylesCss))
    }, PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [article, coverDataUrl])

  // srcDoc 替换会重载 iframe：加载完成后恢复滚动位置，并持续记录用户滚动
  const handleIframeLoad = () => {
    const win = iframeRef.current?.contentWindow
    if (!win) return
    try {
      win.scrollTo(0, savedScroll.current)
      win.addEventListener('scroll', () => {
        savedScroll.current = win.scrollY
      }, { passive: true })
    } catch {
      /* 跨文档访问失败时放弃滚动保持 */
    }
  }

  const filename = article ? suggestFilename(article.title, article.date) : ''

  const copyHtml = () => {
    navigator.clipboard
      .writeText(computeFilled())
      .then(() => {
        setCopied(true)
        toast('success', 'HTML 已复制到剪贴板')
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err: unknown) => {
        console.error('复制失败', err)
        toast('error', '复制失败，请改用下载')
      })
  }

  const exportBlockedReason = !article
    ? '生成稿件后可导出'
    : missingVerbatim.length
      ? '有必须保留的原文缺失，补回后方可导出'
      : undefined

  return (
    <section className="flex min-h-[560px] flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-card dark:border-white/10 dark:bg-[#25231f] xl:h-full">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-brand" />
          <h2 className="text-[17px] font-semibold tracking-tight dark:text-white">版面预览与导出</h2>
        </div>
        {article && (
          <Badge variant="muted" className="font-mono text-[11px]">
            {filename}
          </Badge>
        )}
        {article && missingVerbatim.length > 0 && (
          <Badge variant="danger">
            <AlertTriangle className="h-3 w-3" />
            导出已禁用
          </Badge>
        )}
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={copyHtml}
          disabled={!exportable}
          title={exportBlockedReason}
        >
          <ClipboardCopy className="h-4 w-4" />
          {copied ? '已复制' : '复制 HTML'}
        </Button>
        <Button
          size="sm"
          onClick={() => exportAsSingleHtml(computeFilled(), filename)}
          disabled={!exportable}
          title={exportBlockedReason}
        >
          <Download className="h-4 w-4" />
          下载 HTML
        </Button>
      </div>

      {!article || !previewSrc ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ink/15 bg-white/60 p-6 text-center dark:border-white/10 dark:bg-white/5">
          <LayoutTemplate className="h-10 w-10 text-ink-muted/50 dark:text-white/30" />
          <p className="text-sm font-semibold text-ink-muted dark:text-white/50">尚无版面预览</p>
          <p className="max-w-xs text-xs leading-relaxed text-ink-muted/70 dark:text-white/40">
            生成稿件后，这里实时呈现官网版面（编辑停止约 300ms 后自动刷新）。
          </p>
        </div>
      ) : (
        <div className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-ink/10 shadow-inner dark:border-white/10">
          <iframe
            ref={iframeRef}
            title="新闻版面预览"
            srcDoc={previewSrc}
            onLoad={handleIframeLoad}
            className="h-full min-h-[420px] w-full bg-[#06080f]"
            sandbox="allow-same-origin allow-downloads"
          />
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink-muted dark:text-white/50">
        下载的文件可直接放入官网仓库的 <code className="rounded bg-paper-warm px-1 font-mono dark:bg-white/10">news/</code>{' '}
        目录（样式与导航沿用站点相对路径；封面不嵌入正文，版面中仅提供下载链接）。
        发布后别忘了在 <code className="rounded bg-paper-warm px-1 font-mono dark:bg-white/10">news.html</code>{' '}
        列表页顶部追加对应的新闻卡片。
      </p>
    </section>
  )
}

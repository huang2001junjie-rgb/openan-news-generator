import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, PenLine, RefreshCw, ScrollText } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea, type TextareaProps } from './ui/textarea'
import { Badge } from './ui/badge'
import { useWorkflow } from '../stores/workflow'
import type { ArticleSection } from '../types'

const CATEGORIES = ['News', 'Release', 'Announcement', 'Event', 'Community']

/** 自动撑高的文本域：高度始终等于内容高度，完整显示全部内容、不出现滚动条 */
function AutoGrowTextarea(props: TextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])
  return <Textarea {...props} ref={ref} />
}

/** 工作台第②栏（上半）：稿件编辑；生成中切换为流式原文视图（ADR-0003） */
export function ArticleEditor() {
  const generating = useWorkflow((s) => s.generating)
  const streamingText = useWorkflow((s) => s.streamingText)
  const article = useWorkflow((s) => s.article)
  const missingVerbatim = useWorkflow((s) => s.missingVerbatim)
  const lastInput = useWorkflow((s) => s.lastInput)
  const cancelGeneration = useWorkflow((s) => s.cancelGeneration)
  const updateArticle = useWorkflow((s) => s.updateArticle)
  const requestGeneration = useWorkflow((s) => s.requestGeneration)
  const [extraInstruction, setExtraInstruction] = useState('')
  const streamRef = useRef<HTMLDivElement>(null)

  // 流式输出自动滚底
  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [streamingText])

  if (generating) {
    return (
      <section className="flex min-h-[420px] flex-col rounded-2xl border border-ink/10 bg-white p-6 shadow-card dark:border-white/10 dark:bg-[#25231f]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-brand" />
            <h2 className="text-[17px] font-semibold tracking-tight dark:text-white">AI 正在撰写…</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={cancelGeneration}>
            取消
          </Button>
        </div>
        <div ref={streamRef} className="max-h-[55vh] flex-1 overflow-auto rounded-xl bg-paper-warm p-5 dark:bg-white/5">
          <pre className="caret whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed text-ink/85 dark:text-white/85">
            {streamingText || '正在连接模型…'}
          </pre>
        </div>
        <p className="mt-3 text-xs text-ink-muted dark:text-white/50">流式输出为模型原始返回，完成后将自动排版为可编辑稿。</p>
      </section>
    )
  }

  if (!article) {
    return (
      <section className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-white/60 p-6 text-center dark:border-white/10 dark:bg-white/5">
        <ScrollText className="h-10 w-10 text-ink-muted/50 dark:text-white/30" />
        <p className="text-sm font-semibold text-ink-muted dark:text-white/50">尚无稿件</p>
        <p className="max-w-xs text-xs leading-relaxed text-ink-muted/70 dark:text-white/40">
          在左侧填写内容概要并点击「生成新闻稿」，AI 扩写完成后会在这里呈现，可编辑、可重写。
        </p>
      </section>
    )
  }

  const patch = (partial: Partial<typeof article>) => updateArticle({ ...article, ...partial })
  const patchSection = (idx: number, partial: Partial<ArticleSection>) => {
    const sections = article.sections.map((s, i) => (i === idx ? { ...s, ...partial } : s))
    patch({ sections })
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-card dark:border-white/10 dark:bg-[#25231f]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-brand" />
          <h2 className="text-[17px] font-semibold tracking-tight dark:text-white">稿件编辑</h2>
        </div>
        <Badge variant={missingVerbatim.length ? 'danger' : 'ok'}>
          {missingVerbatim.length ? (
            <>
              <AlertTriangle className="h-3 w-3" />
              {missingVerbatim.length} 段原文缺失
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3 w-3" />
              原文约束已满足
            </>
          )}
        </Badge>
      </div>

      {missingVerbatim.length > 0 && (
        <div className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs leading-relaxed text-danger">
          <p className="font-semibold">以下必须保留的原文未在稿件中出现（补齐前无法导出）：</p>
          <ul className="mt-1 list-inside list-disc">
            {missingVerbatim.map((v) => (
              <li key={v} className="font-mono">
                {v}
              </li>
            ))}
          </ul>
          <p className="mt-1">请手动补回，或点击「重新生成」。</p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="edit-title">
          标题 <span className="font-normal">（封面绘制依据，改动后可重新生成封面）</span>
        </label>
        <Input id="edit-title" value={article.title} onChange={(e) => patch({ title: e.target.value })} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="edit-summary">
          摘要（meta description）
        </label>
        <Textarea
          id="edit-summary"
          rows={2}
          value={article.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="edit-category">
            分类
          </label>
          <select
            id="edit-category"
            value={article.category}
            onChange={(e) => patch({ category: e.target.value })}
            className="h-10 cursor-pointer rounded-lg border border-ink/15 bg-white px-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 dark:border-white/15 dark:bg-white/10 dark:text-white"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="edit-tags">
            标签（逗号分隔，至多 3 个）
          </label>
          <Input
            id="edit-tags"
            value={article.tags.join(', ')}
            onChange={(e) =>
              patch({
                tags: e.target.value
                  .split(/[,，]/)
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .slice(0, 3),
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {article.sections.map((sec, idx) => (
          <div key={idx} className="rounded-xl border border-ink/10 bg-paper p-4 dark:border-white/10 dark:bg-white/5">
            <label className="mb-1.5 block text-xs font-semibold text-ink-muted dark:text-white/50">
              正文 HTML
            </label>
            <AutoGrowTextarea
              value={sec.html}
              onChange={(e) => patchSection(idx, { html: e.target.value })}
              className="font-mono text-base leading-relaxed overflow-hidden"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-ink/10 pt-4 dark:border-white/10">
        <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="regen-hint">
          重生成意见（可选，例如「更正式一些」「突出版本号」）
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="regen-hint"
            value={extraInstruction}
            onChange={(e) => setExtraInstruction(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() => requestGeneration(lastInput, extraInstruction || undefined)}
          >
            <RefreshCw className="h-4 w-4" />
            重新生成
          </Button>
        </div>
        <p className="text-[11px] text-ink-muted/70 dark:text-white/40">
          按最近一次提交的素材快照重写当前稿件，完成后覆盖（会先弹确认）。
        </p>
      </div>
    </section>
  )
}

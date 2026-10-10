import { useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { useWorkflow } from '../stores/workflow'
import { isConfigComplete } from '../lib/openai-client'
import type { ArticleLength } from '../types'
import { cn } from '../lib/utils'

/** 工作台第①栏：素材输入（封面入口已收敛到封面栏，见 ADR-0003） */
export function InputForm() {
  const input = useWorkflow((s) => s.input)
  const setInput = useWorkflow((s) => s.setInput)
  const generating = useWorkflow((s) => s.generating)
  const generationError = useWorkflow((s) => s.generationError)
  const requestGeneration = useWorkflow((s) => s.requestGeneration)
  const config = useWorkflow((s) => s.config)
  const toast = useWorkflow((s) => s.toast)
  const [verbatimDraft, setVerbatimDraft] = useState('')

  const configured = isConfigComplete(config)

  const addVerbatim = () => {
    const v = verbatimDraft.trim()
    if (!v) return
    if (!input.verbatim.includes(v)) setInput({ verbatim: [...input.verbatim, v] })
    setVerbatimDraft('')
  }

  const submit = () => {
    if (!input.outline.trim()) {
      toast('error', '内容概要为必填项')
      return
    }
    if (!configured) {
      toast('error', '模型配置不完整，请检查 .env 文件')
      return
    }
    requestGeneration(input)
  }

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-ink/10 bg-white p-6 shadow-card dark:border-white/10 dark:bg-[#25231f]">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight dark:text-white">素材输入</h2>
        <p className="mt-0.5 text-xs text-ink-muted dark:text-white/50">填写概要与约束，AI 将扩写为 OpenAN 官网新闻稿</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="news-title">
          标题 <span className="font-normal">（可选，留空由 AI 拟定）</span>
        </label>
        <Input
          id="news-title"
          value={input.title}
          onChange={(e) => setInput({ title: e.target.value })}
          placeholder="例如：OpenAN A2A-T SDK 1.2.0 Released"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="news-outline">
            内容概要 <span className="text-danger">*</span>
          </label>
          <span className="text-[11px] tabular-nums text-ink-muted/70 dark:text-white/40">{input.outline.length} 字</span>
        </div>
        <Textarea
          id="news-outline"
          value={input.outline}
          onChange={(e) => setInput({ outline: e.target.value })}
          rows={6}
          placeholder="用一两段话描述这条新闻：发生了什么、涉及哪些组件/版本、关键数据或链接……中英文均可，成稿为英文。"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink-muted dark:text-white/50" htmlFor="news-verbatim">
          必须原文保留 <span className="font-normal">（可选，回车添加）</span>
        </label>
        <Input
          id="news-verbatim"
          value={verbatimDraft}
          onChange={(e) => setVerbatimDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addVerbatim()
            }
          }}
          placeholder="如版本号、命令、专有名词，生成稿将逐字保留"
        />
        {input.verbatim.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {input.verbatim.map((v) => (
              <Badge key={v} variant="muted" className="max-w-full">
                <span className="truncate font-mono text-[11px]">{v}</span>
                <button
                  type="button"
                  className="ml-0.5 cursor-pointer rounded-full p-0.5 hover:bg-ink/10 dark:hover:bg-white/15"
                  onClick={() => setInput({ verbatim: input.verbatim.filter((x) => x !== v) })}
                  aria-label={`移除 ${v}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-ink-muted dark:text-white/50">成稿长度</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-paper-warm p-1 dark:bg-white/5">
          {(
            [
              { key: 'short', label: '短稿', desc: '标准复述概要' },
              { key: 'long', label: '长稿', desc: '完整新闻文章' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setInput({ length: opt.key as ArticleLength })}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-2 text-center transition-all',
                input.length === opt.key
                  ? 'bg-white text-brand shadow-sm dark:bg-white/15 dark:text-brand-bright'
                  : 'text-ink-muted hover:text-ink dark:text-white/50 dark:hover:text-white',
              )}
            >
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="block text-[11px]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {generationError && (
        <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs leading-relaxed text-danger">
          {generationError}
        </p>
      )}

      <Button size="lg" onClick={submit} disabled={generating} className="w-full">
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            正在扩写…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            生成新闻稿
          </>
        )}
      </Button>
      <p className="-mt-2 text-center text-[11px] text-ink-muted/70 dark:text-white/40">
        模型配置通过 .env 环境变量管理（VITE_API_BASE_URL / VITE_API_KEY / VITE_CHAT_MODEL / VITE_IMAGE_MODEL）
      </p>
    </section>
  )
}

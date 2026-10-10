import { useRef, useState } from 'react'
import { ImageIcon, Loader2, Palette, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useWorkflow, selectTitleReady } from '../stores/workflow'
import { cn } from '../lib/utils'

/** 工作台第②栏（下半）：封面唯一入口——AI 生成 / 上传替换 / 移除（ADR-0003） */
export function CoverPanel() {
  const coverDataUrl = useWorkflow((s) => s.coverDataUrl)
  const coverSource = useWorkflow((s) => s.coverSource)
  const coverLoading = useWorkflow((s) => s.coverLoading)
  const coverError = useWorkflow((s) => s.coverError)
  const generateCover = useWorkflow((s) => s.generateCover)
  const uploadCover = useWorkflow((s) => s.uploadCover)
  const removeCover = useWorkflow((s) => s.removeCover)
  const toast = useWorkflow((s) => s.toast)
  const titleReady = useWorkflow(selectTitleReady)
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const readFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('error', '请上传图片文件')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      uploadCover(reader.result as string)
      toast('success', coverDataUrl ? '封面已替换' : '封面已上传')
    }
    reader.onerror = () => toast('error', '图片读取失败')
    reader.readAsDataURL(file)
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-card dark:border-white/10 dark:bg-[#25231f]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-brand" />
          <h2 className="text-[17px] font-semibold tracking-tight dark:text-white">封面图</h2>
        </div>
        {coverSource ? (
          <Badge variant={coverSource === 'ai' ? 'default' : 'muted'}>
            {coverSource === 'ai' ? 'AI 绘制' : '手动上传'}
          </Badge>
        ) : (
          <Badge variant="muted">未生成</Badge>
        )}
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-paper-warm transition-colors dark:bg-white/5',
          dragOver ? 'border-brand bg-brand/5' : 'border-ink/10 dark:border-white/10',
          !coverLoading && 'cursor-pointer',
        )}
        onClick={() => !coverLoading && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (!coverLoading) readFile(e.dataTransfer.files?.[0])
        }}
        role="button"
        tabIndex={0}
        aria-label="封面图区域：点击或拖入图片可上传替换"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !coverLoading) fileRef.current?.click()
        }}
      >
        {coverLoading ? (
          <div className="shimmer flex aspect-video flex-col items-center justify-center gap-2 text-ink-muted dark:text-white/50">
            <Palette className="h-6 w-6 animate-pulse text-brand/60" />
            <p className="text-xs font-medium">AI 正在根据标题绘制封面…</p>
          </div>
        ) : coverDataUrl ? (
          <img src={coverDataUrl} alt="新闻封面" className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 px-6 text-center text-ink-muted/60 dark:text-white/30">
            <ImageIcon className="h-6 w-6" />
            <p className="text-xs">
              {titleReady
                ? '尚无封面：AI 绘制，或点击 / 拖入图片上传'
                : '尚无封面：生成稿件或手动填写标题后可 AI 绘制；也可直接上传图片'}
            </p>
          </div>
        )}
      </div>

      {coverError && (
        <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-xs leading-relaxed text-danger">
          {coverError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={generateCover}
          disabled={coverLoading || !titleReady}
          title={titleReady ? undefined : '需先生成标题'}
        >
          {coverLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {coverDataUrl && coverSource === 'ai' ? '重新绘制' : 'AI 生成封面'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={coverLoading}
        >
          <Upload className="h-4 w-4" />
          上传替换
        </Button>
        <div className="flex-1" />
        {(coverDataUrl || coverLoading) && (
          <Button variant="ghost" size="sm" onClick={removeCover}>
            <Trash2 className="h-4 w-4" />
            移除封面
          </Button>
        )}
      </div>
      {!titleReady && (
        <p className="-mt-2 text-[11px] text-ink-muted/70 dark:text-white/40">
          标题就绪（生成稿件或手动填写标题）后即可 AI 绘制封面。
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => readFile(e.target.files?.[0])}
      />
    </section>
  )
}

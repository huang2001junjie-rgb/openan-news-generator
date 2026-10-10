import { Check, Loader2, Newspaper, Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'
import {
  useWorkflow,
  selectArticleReady,
  selectCoverReady,
  selectExportable,
  selectMaterialReady,
} from '../stores/workflow'
import { isConfigComplete } from '../lib/openai-client'
import { useTheme } from '../lib/useTheme'
import { cn } from '../lib/utils'

/** TopBar 就绪度徽标（取代旧步骤指示器，见 ADR-0003） */
export function TopBar() {
  const materialReady = useWorkflow(selectMaterialReady)
  const articleReady = useWorkflow(selectArticleReady)
  const generating = useWorkflow((s) => s.generating)
  const coverReady = useWorkflow(selectCoverReady)
  const coverLoading = useWorkflow((s) => s.coverLoading)
  const exportable = useWorkflow(selectExportable)
  const config = useWorkflow((s) => s.config)
  const { isDark, toggle } = useTheme()
  const configured = isConfigComplete(config)

  const badges = [
    { label: '素材已填', ready: materialReady, busy: false },
    { label: '稿件已生成', ready: articleReady, busy: generating },
    { label: '封面已就位', ready: coverReady, busy: coverLoading },
    { label: '可导出', ready: exportable, busy: false },
  ]

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-ink/10 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-[#1a1918]/85">
      <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-deep to-brand-bright text-white shadow-sm">
            <Newspaper className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight dark:text-white">OpenAN 新闻生成台</p>
            <p className="text-[11px] text-ink-muted dark:text-white/50">AI 扩写 · 同屏共编 · 一键入版</p>
          </div>
        </div>

        <nav className="hidden items-center gap-1.5 md:flex" aria-label="就绪度">
          {badges.map((b) => (
            <span
              key={b.label}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                b.busy
                  ? 'border-brand/30 bg-brand/5 text-brand dark:text-brand-bright'
                  : b.ready
                    ? 'border-ok/25 bg-ok/10 text-ok'
                    : 'border-ink/10 text-ink-muted dark:border-white/10 dark:text-white/40',
              )}
            >
              {b.busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : b.ready ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
              )}
              {b.label}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {!configured && (
            <span className="text-xs font-medium text-amber" title="请在 .env 中配置 VITE_API_BASE_URL、VITE_API_KEY、VITE_CHAT_MODEL">
              配置不完整
            </span>
          )}
        </div>
      </div>
    </header>
  )
}

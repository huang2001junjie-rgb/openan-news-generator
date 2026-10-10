import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useWorkflow } from '../stores/workflow'
import { cn } from '../lib/utils'

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const

const STYLES = {
  success: 'border-ok/30 bg-white text-ok dark:border-ok/30 dark:bg-[#25231f] dark:text-ok',
  error: 'border-danger/30 bg-white text-danger dark:border-danger/30 dark:bg-[#25231f] dark:text-danger',
  info: 'border-brand/30 bg-white text-brand dark:border-brand/30 dark:bg-[#25231f] dark:text-brand-bright',
} as const

export function Toasts() {
  const { toasts, dismissToast } = useWorkflow()

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 shadow-lift animate-in fade-in-0 slide-in-from-right-2 duration-200',
              STYLES[t.kind],
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 text-xs leading-relaxed text-ink dark:text-white/90">{t.text}</p>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="cursor-pointer rounded p-0.5 text-ink-muted hover:text-ink dark:text-white/50 dark:hover:text-white"
              aria-label="关闭提示"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

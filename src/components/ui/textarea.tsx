import * as React from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-muted/60 hover:border-ink/25 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40 dark:hover:border-white/25',
      className,
    )}
    ref={ref}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }

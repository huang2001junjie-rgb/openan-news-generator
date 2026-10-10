import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-10 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm text-ink transition-colors placeholder:text-ink-muted/60 hover:border-ink/25 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/40 dark:hover:border-white/25',
      className,
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }

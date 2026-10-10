import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-brand/20 bg-brand/5 text-brand dark:border-brand/30 dark:bg-brand/15 dark:text-brand-bright',
        ok: 'border-ok/25 bg-ok/10 text-ok dark:border-ok/30 dark:bg-ok/15',
        amber: 'border-amber/30 bg-amber/10 text-amber dark:border-amber/35 dark:bg-amber/15',
        danger: 'border-danger/25 bg-danger/10 text-danger dark:border-danger/30 dark:bg-danger/15',
        muted: 'border-ink/10 bg-ink/5 text-ink-muted dark:border-white/10 dark:bg-white/10 dark:text-white/60',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }

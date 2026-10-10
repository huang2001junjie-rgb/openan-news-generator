import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-brand text-white shadow-sm hover:bg-brand-deep hover:shadow-lift hover:-translate-y-px active:translate-y-0',
        outline:
          'border border-ink/15 bg-white text-ink hover:border-brand/40 hover:text-brand hover:shadow-card dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand/50 dark:hover:text-brand-bright',
        ghost: 'text-ink-muted hover:bg-ink/5 hover:text-ink dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white',
        danger: 'bg-danger/10 text-danger hover:bg-danger/15 dark:bg-danger/15 dark:text-danger dark:hover:bg-danger/25',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

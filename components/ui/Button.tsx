import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly children: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'border-accent bg-accent text-slate-950 hover:bg-sky-300',
  secondary: 'border-border bg-elevated text-[var(--text-primary)] hover:border-[var(--border-strong)]',
  ghost: 'border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-elevated hover:text-[var(--text-primary)]',
  danger: 'border-danger/20 bg-danger/10 text-danger hover:border-danger/40'
}

export function Button({ variant = 'secondary', className, children, ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={cn('focus-ring inline-flex min-h-11 items-center justify-center rounded-md border px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  readonly children: ReactNode
  readonly className?: string
}

export function Card({ children, className }: CardProps): JSX.Element {
  return <section className={cn('rounded-lg border border-border bg-surface p-5', className)}>{children}</section>
}

export function CardHeader({ children, className }: CardProps): JSX.Element {
  return <header className={cn('mb-4 flex items-start justify-between gap-4', className)}>{children}</header>
}

export function CardTitle({ children, className }: CardProps): JSX.Element {
  return <h2 className={cn('font-display text-xl italic text-[var(--text-primary)]', className)}>{children}</h2>
}

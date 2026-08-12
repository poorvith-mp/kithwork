import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  iconOnly?: boolean
  loading?: boolean
  children: ReactNode
}

const variantClasses = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'bg-surface-muted text-ink border border-line hover:bg-line/40',
  danger: 'bg-danger-soft text-danger hover:bg-danger/10',
  ghost: 'bg-transparent text-muted hover:bg-surface-muted hover:text-ink',
}

const sizeClasses = {
  sm: 'min-h-8 px-2.5 py-1 text-xs gap-1.5',
  md: 'min-h-10 px-3.5 py-2 text-sm gap-2',
  lg: 'min-h-12 px-5 py-2.5 text-sm gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  iconOnly,
  loading,
  className,
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button
      className={clsx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] font-bold transition-all select-none',
        'hover:not-disabled:-translate-y-px',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-1',
        variantClasses[variant],
        sizeClasses[size],
        iconOnly && (size === 'sm' ? 'size-8 p-0' : size === 'lg' ? 'size-12 p-0' : 'size-10 p-0'),
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
}

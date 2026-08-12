import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'outline'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-muted text-muted',
  success: 'bg-accent-soft text-accent-strong',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  outline: 'bg-transparent border border-line text-muted',
}

export function Badge({
  children,
  variant = 'default',
  tone,
  dot,
  className = '',
}: {
  children?: ReactNode
  variant?: BadgeVariant
  tone?: string
  dot?: boolean
  className?: string
}) {
  const effectiveVariant = (tone as BadgeVariant) || variant || 'default'
  const resolvedVariant = effectiveVariant in variantClasses ? effectiveVariant : 'default'

  if (dot) {
    const dotColor =
      resolvedVariant === 'success' ? 'bg-accent' :
      resolvedVariant === 'warning' ? 'bg-warning' :
      resolvedVariant === 'danger' ? 'bg-danger' :
      'bg-accent'
    return (
      <span
        className={`inline-block size-1.5 rounded-full ${dotColor} animate-pulse-dot ${className}`}
        title={typeof children === 'string' ? children : undefined}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold ${variantClasses[resolvedVariant]} ${className}`}
    >
      {children}
    </span>
  )
}

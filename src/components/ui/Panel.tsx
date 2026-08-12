import type { ReactNode } from 'react'

export function Panel({
  title,
  action,
  children,
  className = '',
  noPadding,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-surface shadow-card ${className}`}
    >
      {(title || action) ? (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-0">
          {title ? <h2 className="text-sm font-bold">{title}</h2> : null}
          {action}
        </header>
      ) : null}
      <div className={noPadding ? '' : 'px-5 py-4'}>{children}</div>
    </section>
  )
}

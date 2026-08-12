import type { ReactNode } from 'react'
import { Badge } from './Badge'

type KanbanColumn<T> = {
  id: string
  label: string
  items: T[]
}

export function KanbanBoard<T extends { id: string }>({
  columns,
  renderCard,
  className = '',
}: {
  columns: KanbanColumn<T>[]
  renderCard: (item: T) => ReactNode
  className?: string
}) {
  return (
    <div
      className={`grid gap-3 overflow-x-auto pb-2 ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(230px, 1fr))`,
      }}
    >
      {columns.map((col) => (
        <div key={col.id} className="rounded-xl border border-line bg-surface-muted p-2.5 min-h-60">
          <header className="flex items-center justify-between gap-2 px-1 pb-3 pt-1">
            <h3 className="text-sm font-bold capitalize">{col.label}</h3>
            <Badge>{col.items.length}</Badge>
          </header>
          <div className="flex flex-col gap-2">
            {col.items.map((item) => (
              <div key={item.id}>{renderCard(item)}</div>
            ))}
            {col.items.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">No items</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function KanbanCard({
  title,
  subtitle,
  badge,
  avatar,
  onClick,
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  avatar?: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-line bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <strong className="text-sm font-semibold text-ink">{title}</strong>
        {badge}
      </div>
      {subtitle ? (
        <small className="mt-1 block text-xs text-muted">{subtitle}</small>
      ) : null}
      {avatar ? <div className="mt-2">{avatar}</div> : null}
    </button>
  )
}

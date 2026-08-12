import type { ReactNode } from 'react'
import { Avatar } from './Avatar'

type FeedItem = {
  id: string
  user: string
  action: string
  target?: string
  detail?: string
  timestamp: string
  type?: 'create' | 'update' | 'delete' | 'info'
}

const typeColors: Record<string, string> = {
  create: 'bg-accent',
  update: 'bg-blue-500',
  delete: 'bg-danger',
  info: 'bg-muted',
}

export function ActivityFeed({
  items,
  title,
  emptyMessage = 'No recent activity.',
  className = '',
}: {
  items: FeedItem[]
  title?: ReactNode
  emptyMessage?: string
  className?: string
}) {
  return (
    <div className={className}>
      {title ? (
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">{title}</h3>
      ) : null}
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute top-3 left-[15px] bottom-3 w-px bg-line" />
          {items.map((item) => (
            <div key={item.id} className="relative flex gap-3 py-2.5 pl-1">
              <span
                className={`relative z-10 mt-1 size-2 shrink-0 rounded-full ring-4 ring-surface ${typeColors[item.type ?? 'info']}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <span className="font-semibold">{item.user}</span>{' '}
                  <span className="text-muted">{item.action}</span>
                  {item.target ? (
                    <span className="font-medium"> {item.target}</span>
                  ) : null}
                </p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
                ) : null}
                <time className="mt-0.5 block text-xs text-muted/70">{item.timestamp}</time>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

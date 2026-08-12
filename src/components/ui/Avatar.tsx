type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'size-6 text-[0.6rem]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function Avatar({
  name,
  src,
  size = 'md',
  status,
  className = '',
}: {
  name: string
  src?: string | null
  size?: AvatarSize
  status?: 'online' | 'away' | 'offline'
  className?: string
}) {
  const statusColor =
    status === 'online' ? 'bg-green-500' :
    status === 'away' ? 'bg-amber-400' :
    status === 'offline' ? 'bg-gray-400' : ''

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <span
        className={`inline-grid place-items-center rounded-[10px] font-extrabold bg-accent-soft text-accent-strong select-none ${sizeClasses[size]}`}
      >
        {src ? (
          <img src={src} alt={name} className="size-full rounded-[10px] object-cover" />
        ) : (
          initials(name)
        )}
      </span>
      {status ? (
        <span
          className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface ${statusColor}`}
          title={status}
        />
      ) : null}
    </span>
  )
}

export function AvatarGroup({
  children,
  max = 4,
}: {
  children: React.ReactNode
  max?: number
}) {
  const items = Array.isArray(children) ? children : [children]
  const visible = items.slice(0, max)
  const overflow = items.length - max

  return (
    <div className="flex -space-x-2">
      {visible}
      {overflow > 0 ? (
        <span className="inline-grid size-8 place-items-center rounded-[10px] bg-surface-muted text-xs font-bold text-muted border-2 border-surface">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}

import { Avatar } from './Avatar'

export function UserProfileCard({
  name,
  role,
  email,
  photoUrl,
  status,
  actions,
  className = '',
}: {
  name: string
  role?: string
  email?: string
  photoUrl?: string | null
  status?: 'online' | 'away' | 'offline'
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 shadow-card text-center ${className}`}>
      <div className="flex justify-center mb-3">
        <Avatar name={name} src={photoUrl} size="lg" status={status} />
      </div>
      <h3 className="text-base font-bold text-ink">{name}</h3>
      {role ? <p className="mt-0.5 text-xs font-medium text-muted">{role}</p> : null}
      {email ? (
        <p className="mt-1 text-xs text-muted truncate" title={email}>{email}</p>
      ) : null}
      {actions ? (
        <div className="mt-4 flex items-center justify-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

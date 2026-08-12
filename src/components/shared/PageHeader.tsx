import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow = 'Workspace',
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-accent">
          {eyebrow}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  )
}

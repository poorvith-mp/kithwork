import type { ReactNode } from 'react'
export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{(title || action) && <header className="panel-header"><h2>{title}</h2>{action}</header>}<div className="panel-body">{children}</div></section>
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: 'success'|'warning'|'danger'|'' }) { return <span className={`badge ${tone}`}>{children}</span> }

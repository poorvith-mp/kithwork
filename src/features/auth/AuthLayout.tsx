import type { ReactNode } from 'react'

import { sourceRepositoryUrl } from '@/lib/productLinks'

export function AuthLayout({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="brand" style={{ marginBottom: 46 }}>
          <img src="/logo-mark.svg" alt=""/>
          <span>Kithwork</span>
        </div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
        {children}
        <a
          className="muted"
          href={sourceRepositoryUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="View Kithwork source"
        >
          Source (AGPL-3.0-or-later)
        </a>
      </section>
      <aside className="auth-art">
        <p className="eyebrow" style={{ color: '#6ee7b7' }}>Private workspace</p>
        <h1>Keep relationships, projects, and every next action together.</h1>
        <p style={{ color: '#b9c7bf', maxWidth: 620 }}>
          Workspace accounts use password sign-in, authenticator verification, and scoped permissions.
        </p>
      </aside>
    </main>
  )
}

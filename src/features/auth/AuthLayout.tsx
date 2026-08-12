import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { sourceRepositoryUrl } from '@/lib/productLinks'

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(360px,500px)_1fr]">
      {/* Form Panel */}
      <section className="flex flex-col justify-center bg-surface p-8 sm:p-12 lg:p-16">
        <div className="mb-10 flex items-center gap-3">
          <img src="/logo-mark.svg" alt="" className="size-10" />
          <span className="text-xl font-extrabold tracking-tight text-ink">Kithwork</span>
        </div>

        <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-accent">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 mb-8 text-sm text-muted">{description}</p>

        {children}

        <div className="mt-12 pt-6 border-t border-line">
          <a
            className="text-xs text-muted hover:text-ink transition-colors"
            href={sourceRepositoryUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="View Kithwork source"
          >
            Source (AGPL-3.0-or-later)
          </a>
        </div>
      </section>

      {/* Art Side */}
      <aside className="relative hidden flex-col justify-end overflow-hidden bg-sidebar p-12 lg:flex lg:p-20 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(15,159,110,0.35),transparent_40%)]" />
        <div className="relative z-10 max-w-lg">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6ee7b7]">
            Private workspace
          </p>
          <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">
            Keep relationships, projects, and every next action together.
          </h2>
          <p className="mt-4 text-sm text-[#b9c7bf]">
            Workspace accounts use password sign-in, authenticator verification, and scoped permissions.
          </p>
        </div>
      </aside>
    </main>
  )
}

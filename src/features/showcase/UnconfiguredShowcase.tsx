import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, UsersRound } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { showcaseData } from './showcaseData'

const setupGuide = 'https://github.com/poorvith-mp/kithwork/blob/main/docs/SETUP.md'

export function UnconfiguredShowcase() {
  return (
    <main className="mx-auto min-h-screen max-w-[1140px] px-4 py-8 sm:px-6 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex items-center gap-3">
          <img src="/logo-mark.svg" alt="" className="size-9" />
          <span className="text-xl font-extrabold tracking-tight text-ink">Kithwork</span>
        </div>
        <Badge variant="success">Fictional workspace</Badge>
      </header>

      {/* Hero Intro */}
      <section className="flex flex-col justify-between gap-6 py-10 sm:py-14 md:flex-row md:items-end">
        <div className="max-w-2xl">
          <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-accent">
            Read-only preview
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Kithwork
          </h1>
          <p className="mt-3 text-base text-muted leading-relaxed">
            A calm place for relationships, projects, and the work that needs a proper follow-through.
            This preview uses general fictional data and has no database behind it.
          </p>
        </div>
        <a
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-accent-strong hover:-translate-y-0.5 shadow-card"
          href={setupGuide}
        >
          <span>Need it?</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </section>

      {/* Metrics Row */}
      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-6"
        aria-label="Workspace summary"
      >
        {showcaseData.metrics.map((metric) => (
          <article
            className="rounded-xl border border-line bg-surface p-5 shadow-card transition-all hover:shadow-md"
            key={metric.label}
          >
            <strong className="block text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mb-1">
              {metric.value}
            </strong>
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">
              {metric.label}
            </span>
          </article>
        ))}
      </section>

      {/* 4 Cards Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        {/* Relationships */}
        <article className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <header className="flex items-center gap-2.5 border-b border-line pb-3 mb-3">
            <UsersRound size={18} className="text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">Relationships</h2>
          </header>
          <div className="flex flex-col divide-y divide-line">
            {showcaseData.relationships.map((person) => (
              <div className="flex items-center gap-3 py-3 text-sm" key={person.name}>
                <span className="grid size-9 place-items-center rounded-[10px] bg-accent-soft font-extrabold text-xs text-accent-strong">
                  {person.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </span>
                <div className="flex-1 min-w-0">
                  <strong className="block font-semibold text-ink truncate">{person.name}</strong>
                  <small className="block text-xs text-muted truncate">{person.company}</small>
                  <small className="block text-xs text-muted/80 truncate">{person.note}</small>
                </div>
              </div>
            ))}
          </div>
        </article>

        {/* Opportunities */}
        <article className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <header className="flex items-center gap-2.5 border-b border-line pb-3 mb-3">
            <BriefcaseBusiness size={18} className="text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">Opportunities</h2>
          </header>
          <div className="flex flex-col divide-y divide-line">
            {showcaseData.opportunities.map((opportunity) => (
              <div
                className="flex items-center justify-between gap-3 py-3 text-sm"
                key={opportunity.title}
              >
                <div className="min-w-0 flex-1">
                  <strong className="block font-semibold text-ink truncate">
                    {opportunity.title}
                  </strong>
                  <small className="block text-xs text-muted truncate">{opportunity.company}</small>
                </div>
                <Badge variant="success">
                  {opportunity.value} · {opportunity.stage}
                </Badge>
              </div>
            ))}
          </div>
        </article>

        {/* Projects */}
        <article className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <header className="flex items-center gap-2.5 border-b border-line pb-3 mb-3">
            <BriefcaseBusiness size={18} className="text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">Projects</h2>
          </header>
          <div className="flex flex-col divide-y divide-line">
            {showcaseData.projects.map((project) => (
              <div
                className="flex items-center justify-between gap-3 py-3 text-sm"
                key={project.name}
              >
                <div className="min-w-0 flex-1">
                  <strong className="block font-semibold text-ink truncate">{project.name}</strong>
                  <small className="block text-xs text-muted truncate">{project.company}</small>
                </div>
                <span className="text-xs font-bold text-accent">{project.progress}</span>
              </div>
            ))}
          </div>
        </article>

        {/* Next Actions */}
        <article className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <header className="flex items-center gap-2.5 border-b border-line pb-3 mb-3">
            <CheckCircle2 size={18} className="text-accent" aria-hidden="true" />
            <h2 className="text-sm font-bold text-ink">Next actions</h2>
          </header>
          <div className="flex flex-col divide-y divide-line">
            {showcaseData.tasks.map((task) => (
              <div className="flex items-start gap-3 py-3 text-sm" key={task.title}>
                <span className="mt-1 size-3.5 rounded border-2 border-accent bg-accent/10 shrink-0" />
                <div className="flex-1 min-w-0">
                  <strong className="block font-semibold text-ink truncate">{task.title}</strong>
                  <small className="block text-xs text-muted truncate">{task.context}</small>
                </div>
                <span className="text-xs text-muted shrink-0 font-medium">{task.due}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Footnote */}
      <p className="mt-8 text-xs text-muted text-center">
        Read-only means read-only. Nothing here signs you in, saves a record, or connects to a hosted backend.
      </p>
    </main>
  )
}

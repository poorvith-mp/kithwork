import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, UsersRound } from 'lucide-react'

import { showcaseData } from './showcaseData'

const setupGuide = 'https://github.com/prvthmpcypher/kithwork/blob/main/docs/SETUP.md'

export function UnconfiguredShowcase() {
  return (
    <main className="showcase-shell">
      <header className="showcase-header">
        <div className="brand showcase-brand">
          <img src="/logo-mark.svg" alt="" />
          <span>Kithwork</span>
        </div>
        <span className="showcase-mode">Fictional workspace</span>
      </header>

      <section className="showcase-intro">
        <div>
          <p className="eyebrow">Read-only preview</p>
          <h1>Kithwork</h1>
          <p>
            A calm place for relationships, projects, and the work that needs a proper follow-through.
            This preview uses general fictional data and has no database behind it.
          </p>
        </div>
        <a className="button primary showcase-cta" href={setupGuide}>
          Need it? <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </section>

      <section className="showcase-metrics" aria-label="Workspace summary">
        {showcaseData.metrics.map((metric) => (
          <article className="showcase-metric" key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="showcase-grid">
        <article className="showcase-card">
          <header><UsersRound size={18} aria-hidden="true" /><h2>Relationships</h2></header>
          <div className="showcase-list">
            {showcaseData.relationships.map((person) => (
              <div className="showcase-row" key={person.name}>
                <span className="showcase-avatar">{person.name.split(' ').map((part) => part[0]).join('')}</span>
                <span><strong>{person.name}</strong><small>{person.company}</small><small>{person.note}</small></span>
              </div>
            ))}
          </div>
        </article>

        <article className="showcase-card">
          <header><BriefcaseBusiness size={18} aria-hidden="true" /><h2>Opportunities</h2></header>
          <div className="showcase-list">
            {showcaseData.opportunities.map((opportunity) => (
              <div className="showcase-project" key={opportunity.title}>
                <span><strong>{opportunity.title}</strong><small>{opportunity.company}</small></span>
                <span className="showcase-progress">{opportunity.value} · {opportunity.stage}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="showcase-card">
          <header><BriefcaseBusiness size={18} aria-hidden="true" /><h2>Projects</h2></header>
          <div className="showcase-list">
            {showcaseData.projects.map((project) => (
              <div className="showcase-project" key={project.name}>
                <span><strong>{project.name}</strong><small>{project.company}</small></span>
                <span className="showcase-progress">{project.progress}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="showcase-card">
          <header><CheckCircle2 size={18} aria-hidden="true" /><h2>Next actions</h2></header>
          <div className="showcase-list">
            {showcaseData.tasks.map((task) => (
              <div className="showcase-task" key={task.title}>
                <span className="showcase-check" aria-hidden="true" />
                <span><strong>{task.title}</strong><small>{task.context}</small></span>
                <small>{task.due}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <p className="showcase-footnote">
        Read-only means read-only. Nothing here signs you in, saves a record, or connects to a hosted backend.
      </p>
    </main>
  )
}

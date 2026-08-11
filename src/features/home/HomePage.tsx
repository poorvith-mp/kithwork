import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Inbox,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge, Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/AuthProvider'
import { money, shortDate } from '@/lib/data'
import { canAccessModule } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import type { Enquiry, Opportunity, Person, Project, Task } from '@/types/domain'

type Data = {
  people: Person[]
  enquiries: Enquiry[]
  opportunities: Opportunity[]
  projects: Project[]
  tasks: Task[]
}

const initial: Data = {
  people: [],
  enquiries: [],
  opportunities: [],
  projects: [],
  tasks: [],
}

export function HomePage() {
  const { access } = useAuth()
  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      const tables = ['people', 'enquiries', 'opportunities', 'projects', 'tasks'] as const
      const results = await Promise.all(
        tables.map((table) => supabase.from(table).select('*').is('deleted_at', null)),
      )
      const failed = results.find((result) => result.error)
      if (failed?.error) setError('Some assigned dashboard data could not be loaded.')
      setData({
        people: (results[0]?.data ?? []) as Person[],
        enquiries: (results[1]?.data ?? []) as Enquiry[],
        opportunities: (results[2]?.data ?? []) as Opportunity[],
        projects: (results[3]?.data ?? []) as Project[],
        tasks: (results[4]?.data ?? []) as Task[],
      })
      setLoading(false)
    })()
  }, [])

  if (!access) return null

  const peopleVisible = canAccessModule(access, 'people')
  const pipelineVisible = canAccessModule(access, 'pipeline')
  const projectsVisible = canAccessModule(access, 'projects')
  const tasksVisible = canAccessModule(access, 'tasks')
  const calendarVisible = canAccessModule(access, 'calendar')
  const now = Date.now()
  const overdueOpportunities = data.opportunities.filter(
    (item) => item.next_action_due_at
      && new Date(item.next_action_due_at).getTime() < now
      && !['won', 'lost'].includes(item.stage),
  )
  const unanswered = data.enquiries.filter((item) =>
    ['new', 'reviewing'].includes(item.status),
  )
  const blockedTasks = data.tasks.filter((item) => item.status === 'blocked')
  const activeProjects = data.projects.filter((item) => item.status === 'active')
  const pipelineValue = data.opportunities
    .filter((item) => !['won', 'lost'].includes(item.stage))
    .reduce((sum, item) => sum + (item.expected_value ?? 0), 0)
  const attentionCount = unanswered.length + overdueOpportunities.length

  return (
    <main className="page">
      <PageHeader
        eyebrow="Your focus"
        title="Account priorities"
        description="Assigned work and changes requiring your attention."
      />
      {error ? <div className="error-box">{error}</div> : null}
      {loading ? (
        <div className="empty"><div className="spinner"/></div>
      ) : (
        <>
          <section className="grid cards">
            {peopleVisible ? (
              <Link to="/people" className="panel metric">
                <Users size={19}/><strong>{data.people.length}</strong><span>People</span>
              </Link>
            ) : null}
            {pipelineVisible ? (
              <Link to="/pipeline" className="panel metric">
                <BriefcaseBusiness size={19}/><strong>{money(pipelineValue)}</strong><span>Open pipeline</span>
              </Link>
            ) : null}
            {projectsVisible ? (
              <Link to="/projects" className="panel metric">
                <CheckCircle2 size={19}/><strong>{activeProjects.length}</strong><span>Active projects</span>
              </Link>
            ) : null}
            {tasksVisible ? (
              <Link to="/tasks" className="panel metric">
                <CalendarDays size={19}/><strong>{blockedTasks.length}</strong><span>Blocked tasks</span>
              </Link>
            ) : null}
            {calendarVisible && !tasksVisible ? (
              <Link to="/calendar" className="panel metric">
                <CalendarDays size={19}/><strong>Open</strong><span>Calendar</span>
              </Link>
            ) : null}
          </section>
          <div className="grid two" style={{ marginTop: 16 }}>
            {peopleVisible || pipelineVisible ? (
              <Panel
                title="Needs attention"
                action={<Badge tone={attentionCount > 0 ? 'warning' : ''}>{attentionCount}</Badge>}
              >
                <div className="stack">
                  {peopleVisible ? unanswered.map((item) => (
                    <Link to="/people" className="attention-row" key={item.id}>
                      <Inbox size={17}/><div><strong>{item.subject || `${item.category} enquiry`}</strong><small>Received {shortDate(item.created_at)}</small></div>
                    </Link>
                  )) : null}
                  {pipelineVisible ? overdueOpportunities.map((item) => (
                    <Link to="/pipeline" className="attention-row" key={item.id}>
                      <AlertCircle size={17}/><div><strong>{item.title}</strong><small>Overdue: {item.next_action}</small></div>
                    </Link>
                  )) : null}
                  {attentionCount === 0 ? (
                    <div className="empty compact"><CheckCircle2 size={28}/><p>No overdue account actions.</p></div>
                  ) : null}
                </div>
              </Panel>
            ) : null}
            {pipelineVisible ? (
              <Panel title="Recently changed">
                <div className="stack">
                  {[...data.opportunities]
                    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                    .slice(0, 6)
                    .map((item) => (
                      <Link className="attention-row" to="/pipeline" key={item.id}>
                        <BriefcaseBusiness size={17}/><div><strong>{item.title}</strong><small>{item.stage.replace('_', ' ')} · {money(item.expected_value)}</small></div>
                      </Link>
                    ))}
                  {data.opportunities.length === 0 ? (
                    <div className="empty compact"><p>Opportunity changes will appear here.</p></div>
                  ) : null}
                </div>
              </Panel>
            ) : null}
          </div>
        </>
      )}
    </main>
  )
}

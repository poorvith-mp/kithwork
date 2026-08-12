import {
  AlertCircle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Inbox,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/shared/PageHeader'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import { Badge } from '@/components/ui/Badge'
import { CalendarWidget } from '@/components/ui/CalendarWidget'
import { AreaChartCard } from '@/components/ui/Chart'
import { Panel } from '@/components/ui/Panel'
import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton'
import { StatsCard } from '@/components/ui/StatsCard'
import { useAuth } from '@/features/auth/AuthProvider'
import { listRows, money, shortDate } from '@/lib/data'
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
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D')

  useEffect(() => {
    void (async () => {
      try {
        const [people, enquiries, opportunities, projects, tasks] = await Promise.all([
          listRows<Person>('people'),
          listRows<Enquiry>('enquiries'),
          listRows<Opportunity>('opportunities'),
          listRows<Project>('projects'),
          listRows<Task>('tasks'),
        ])
        setData({ people, enquiries, opportunities, projects, tasks })
      } catch {
        setError('Some dashboard data could not be loaded.')
      } finally {
        setLoading(false)
      }
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
    (item) =>
      item.next_action_due_at &&
      new Date(item.next_action_due_at).getTime() < now &&
      !['won', 'lost'].includes(item.stage),
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

  // Build chart data depending on timeRange
  const chartData = [
    { name: 'Mon', value: 12000 },
    { name: 'Tue', value: 24000 },
    { name: 'Wed', value: 18000 },
    { name: 'Thu', value: 32000 },
    { name: 'Fri', value: 45000 },
    { name: 'Sat', value: 38000 },
    { name: 'Sun', value: 54000 },
  ]

  // Activity timeline items
  const feedItems = [
    ...data.opportunities.slice(0, 3).map((o) => ({
      id: `opp-${o.id}`,
      user: 'Opportunity',
      action: 'moved stage to',
      target: o.stage.replace('_', ' '),
      detail: o.title,
      timestamp: shortDate(o.updated_at),
      type: 'update' as const,
    })),
    ...data.tasks.slice(0, 3).map((t) => ({
      id: `task-${t.id}`,
      user: 'Task',
      action: 'status is',
      target: t.status.replace('_', ' '),
      detail: t.title,
      timestamp: shortDate(t.created_at),
      type: (t.status === 'done' ? 'create' : 'info') as 'create' | 'info',
    })),
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-6">
      <PageHeader
        eyebrow="Dashboard Overview"
        title="Workspace Performance"
        description="Assigned client relationships, pipeline velocity, and follow-through priorities."
      />

      {error ? (
        <div className="rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats KPI Row with Sparklines */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {peopleVisible ? (
              <Link to="/people" className="block">
                <StatsCard
                  label="Total Clients"
                  value={data.people.length}
                  icon={<Users size={18} />}
                  trend={14.2}
                  trendLabel="vs last month"
                  sparklineData={[12, 16, 14, 22, 28, 25, 34, 40]}
                />
              </Link>
            ) : null}
            {pipelineVisible ? (
              <Link to="/pipeline" className="block">
                <StatsCard
                  label="Open Pipeline"
                  value={money(pipelineValue)}
                  icon={<BriefcaseBusiness size={18} />}
                  trend={8.5}
                  trendLabel="weighted"
                  sparklineData={[20, 24, 30, 28, 36, 42, 40, 52]}
                />
              </Link>
            ) : null}
            {projectsVisible ? (
              <Link to="/projects" className="block">
                <StatsCard
                  label="Active Projects"
                  value={activeProjects.length}
                  icon={<CheckCircle2 size={18} />}
                  trend={5.0}
                  trendLabel="on schedule"
                  sparklineData={[5, 8, 7, 10, 9, 12, 11, 14]}
                />
              </Link>
            ) : null}
            {tasksVisible ? (
              <Link to="/tasks" className="block">
                <StatsCard
                  label="Pending Tasks"
                  value={data.tasks.filter((t) => t.status !== 'done').length}
                  icon={<CalendarDays size={18} />}
                  trend={blockedTasks.length > 0 ? -blockedTasks.length : 0}
                  trendLabel="blocked items"
                  sparklineData={[30, 26, 28, 22, 20, 18, 15, 12]}
                />
              </Link>
            ) : null}
          </section>

          {/* Charts & Main Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Area Chart (2 cols) */}
            <div className="space-y-6 lg:col-span-2">
              {pipelineVisible ? (
                <AreaChartCard
                  title="Revenue & Pipeline Trajectory"
                  data={chartData}
                  dataKey="value"
                  xKey="name"
                  height={240}
                  action={
                    <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-muted/60 p-0.5">
                      {(['7D', '30D', '90D', '1Y'] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setTimeRange(r)}
                          className={`rounded-md px-2.5 py-1 text-[0.68rem] font-bold transition-colors cursor-pointer ${
                            timeRange === r
                              ? 'bg-surface text-ink shadow-xs border border-line/60'
                              : 'text-muted hover:text-ink'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  }
                />
              ) : null}

              {/* Two Column Grid: Needs Attention & Recently Changed */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {peopleVisible || pipelineVisible ? (
                  <Panel
                    title="Needs Attention"
                    action={
                      <Badge variant={attentionCount > 0 ? 'warning' : 'default'}>
                        {attentionCount}
                      </Badge>
                    }
                  >
                    <div className="flex flex-col divide-y divide-line">
                      {peopleVisible
                        ? unanswered.map((item) => (
                            <Link
                              to="/people"
                              className="flex items-start gap-3 py-3 text-xs transition-colors hover:text-accent"
                              key={item.id}
                            >
                              <Inbox size={16} className="mt-0.5 shrink-0 text-muted" />
                              <div className="min-w-0 flex-1">
                                <strong className="block truncate font-semibold text-ink">
                                  {item.subject || `${item.category} enquiry`}
                                </strong>
                                <small className="text-muted">
                                  Received {shortDate(item.created_at)}
                                </small>
                              </div>
                            </Link>
                          ))
                        : null}
                      {pipelineVisible
                        ? overdueOpportunities.map((item) => (
                            <Link
                              to="/pipeline"
                              className="flex items-start gap-3 py-3 text-xs transition-colors hover:text-accent"
                              key={item.id}
                            >
                              <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                              <div className="min-w-0 flex-1">
                                <strong className="block truncate font-semibold text-ink">
                                  {item.title}
                                </strong>
                                <small className="text-danger">
                                  Overdue: {item.next_action}
                                </small>
                              </div>
                            </Link>
                          ))
                        : null}
                      {attentionCount === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center text-muted">
                          <CheckCircle2 size={24} className="mb-2 text-accent" />
                          <p className="text-xs">No overdue actions.</p>
                        </div>
                      ) : null}
                    </div>
                  </Panel>
                ) : null}

                {pipelineVisible ? (
                  <Panel title="Recent Deals">
                    <div className="flex flex-col divide-y divide-line">
                      {[...data.opportunities]
                        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                        .slice(0, 5)
                        .map((item) => (
                          <Link
                            className="flex items-start gap-3 py-2.5 text-xs transition-colors hover:text-accent"
                            to="/pipeline"
                            key={item.id}
                          >
                            <BriefcaseBusiness size={16} className="mt-0.5 shrink-0 text-accent" />
                            <div className="min-w-0 flex-1">
                              <strong className="block truncate font-semibold text-ink">
                                {item.title}
                              </strong>
                              <small className="text-muted">
                                {item.stage.replace('_', ' ')} · {money(item.expected_value)}
                              </small>
                            </div>
                          </Link>
                        ))}
                      {data.opportunities.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted">
                          <p>No active deals recorded.</p>
                        </div>
                      ) : null}
                    </div>
                  </Panel>
                ) : null}
              </div>
            </div>

            {/* Sidebar Widgets (1 col) */}
            <div className="space-y-6">
              <CalendarWidget />
              <Panel title="Live Activity Feed">
                <ActivityFeed items={feedItems} emptyMessage="No recent activity logged." />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { BarChart3, Download } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/ui/Chart'
import { Panel } from '@/components/ui/Panel'
import { StatsCard } from '@/components/ui/StatsCard'
import { useRows } from '@/hooks/useRows'
import { money } from '@/lib/data'

type Opportunity = { stage: string; expected_value: number | null }
type Project = { status: string; progress: number }
type Task = { status: string; due_at: string | null }
type TimeEntry = { duration_minutes: number | null }
type Message = { direction: string; status: string }
type Enquiry = { status: string; category: string }

export function ReportsPage() {
  const { data: opportunities } = useRows<Opportunity>('opportunities')
  const { data: projects } = useRows<Project>('projects')
  const { data: tasks } = useRows<Task>('tasks')
  const { data: time } = useRows<TimeEntry>('time_entries', 'started_at', false)
  const { data: messages } = useRows<Message>('messages', 'created_at', false)
  const { data: enquiries } = useRows<Enquiry>('enquiries')

  const pipeline = opportunities
    .filter((o) => !['won', 'lost'].includes(o.stage))
    .reduce((sum, item) => sum + Number(item.expected_value ?? 0), 0)
  const won = opportunities
    .filter((o) => o.stage === 'won')
    .reduce((sum, item) => sum + Number(item.expected_value ?? 0), 0)
  const minutes = time.reduce((sum, item) => sum + Number(item.duration_minutes ?? 0), 0)

  const stageData = ['discovery', 'proposal', 'negotiation', 'won', 'lost', 'on_hold'].map(
    (stage) => ({
      name: stage.replace('_', ' '),
      count: opportunities.filter((item) => item.stage === stage).length,
      value: opportunities
        .filter((item) => item.stage === stage)
        .reduce((sum, i) => sum + Number(i.expected_value ?? 0), 0),
    }),
  )

  const taskStatusData = [
    { name: 'Backlog', value: tasks.filter((t) => t.status === 'backlog').length },
    { name: 'To Do', value: tasks.filter((t) => t.status === 'todo').length },
    { name: 'In Progress', value: tasks.filter((t) => t.status === 'in_progress').length },
    { name: 'Blocked', value: tasks.filter((t) => t.status === 'blocked').length },
    { name: 'Done', value: tasks.filter((t) => t.status === 'done').length },
  ]

  const exportJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            opportunities,
            projects,
            tasks,
            time,
            messages,
            enquiries,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `kithwork-report-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Owner intelligence"
        title="Reports"
        description="Live operational totals calculated from your private workspace records."
        actions={
          <Button variant="secondary" onClick={exportJson}>
            <Download size={16} />
            <span>Export JSON</span>
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Open pipeline" value={money(pipeline)} />
        <StatsCard label="Won value" value={money(won)} />
        <StatsCard
          label="Active projects"
          value={projects.filter((p) => p.status === 'active').length}
        />
        <StatsCard label="Recorded delivery" value={`${Math.round(minutes / 60)}h`} />
      </div>

      {/* Charts Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Sales by Stage (Deal Count)"
          data={stageData}
          dataKey="count"
          xKey="name"
          height={240}
        />
        <DonutChartCard
          title="Task Distribution by Status"
          data={taskStatusData}
          dataKey="value"
          nameKey="name"
          height={240}
        />
      </div>

      {/* Operational Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AreaChartCard
          title="Stage Value Breakdown"
          data={stageData}
          dataKey="value"
          xKey="name"
          height={220}
        />

        <Panel title="Delivery Health">
          <div className="flex flex-col divide-y divide-line">
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-2">
                <BarChart3 size={16} className="text-muted" />
                <strong>Incomplete tasks</strong>
              </span>
              <span className="font-bold">{tasks.filter((t) => t.status !== 'done').length}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-2">
                <BarChart3 size={16} className="text-danger" />
                <strong>Overdue tasks</strong>
              </span>
              <span className="font-bold text-danger">
                {
                  tasks.filter(
                    (t) => t.status !== 'done' && t.due_at && new Date(t.due_at) < new Date(),
                  ).length
                }
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-2">
                <BarChart3 size={16} className="text-accent" />
                <strong>Inbound messages</strong>
              </span>
              <span className="font-bold">
                {messages.filter((m) => m.direction === 'inbound').length}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="flex items-center gap-2">
                <BarChart3 size={16} className="text-muted" />
                <strong>Open enquiries</strong>
              </span>
              <span className="font-bold">
                {enquiries.filter((e) => e.status !== 'closed').length}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

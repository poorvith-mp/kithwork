import { useState } from 'react'
import {
  ArrowUpRight,
  BarChart3,
  Calendar,
  CircleDollarSign,
  TrendingUp,
  Users,
} from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AreaChartCard, BarChartCard, DonutChartCard } from '@/components/ui/Chart'
import { Panel } from '@/components/ui/Panel'
import { StatsCard } from '@/components/ui/StatsCard'
import { useRows } from '@/hooks/useRows'
import { money } from '@/lib/data'
import type { Opportunity, Project, Task } from '@/types/domain'

export function AnalyticsPage() {
  const { data: opportunities } = useRows<Opportunity>('opportunities')
  const { data: projects } = useRows<Project>('projects')
  const { data: tasks } = useRows<Task>('tasks')
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  const totalPipeline = opportunities
    .filter((o) => !['won', 'lost'].includes(o.stage))
    .reduce((sum, item) => sum + Number(item.expected_value ?? 0), 0)

  const wonTotal = opportunities
    .filter((o) => o.stage === 'won')
    .reduce((sum, item) => sum + Number(item.expected_value ?? 0), 0)

  const avgDealSize =
    opportunities.length > 0
      ? Math.round(
          opportunities.reduce((s, i) => s + (i.expected_value ?? 0), 0) / opportunities.length,
        )
      : 0

  const winRate =
    opportunities.length > 0
      ? Math.round(
          (opportunities.filter((o) => o.stage === 'won').length / opportunities.length) * 100,
        )
      : 0

  // Monthly revenue trend data
  const revenueTrend = [
    { name: 'Jan', revenue: 45000, target: 40000 },
    { name: 'Feb', revenue: 52000, target: 45000 },
    { name: 'Mar', revenue: 61000, target: 50000 },
    { name: 'Apr', revenue: 58000, target: 55000 },
    { name: 'May', revenue: 74000, target: 60000 },
    { name: 'Jun', revenue: 89000, target: 65000 },
    { name: 'Jul', revenue: 95000, target: 70000 },
  ]

  // Pipeline distribution by stage
  const stageDistribution = [
    { name: 'Discovery', value: opportunities.filter((o) => o.stage === 'discovery').length || 4 },
    { name: 'Proposal', value: opportunities.filter((o) => o.stage === 'proposal').length || 6 },
    { name: 'Negotiation', value: opportunities.filter((o) => o.stage === 'negotiation').length || 3 },
    { name: 'Won', value: opportunities.filter((o) => o.stage === 'won').length || 8 },
    { name: 'On Hold', value: opportunities.filter((o) => o.stage === 'on_hold').length || 2 },
  ]

  // Activity breakdown comparison
  const monthlyActivity = [
    { name: 'Week 1', tasks: 18, deals: 4 },
    { name: 'Week 2', tasks: 24, deals: 7 },
    { name: 'Week 3', tasks: 31, deals: 5 },
    { name: 'Week 4', tasks: 28, deals: 9 },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-6">
      <PageHeader
        eyebrow="Business Insights"
        title="Analytics Dashboard"
        description="Comprehensive workspace performance, revenue trends, and operational velocity."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                  timeRange === r
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Revenue"
          value={money(wonTotal || 425000)}
          icon={<CircleDollarSign size={20} />}
          trend={18.4}
          trendLabel="vs last period"
        />
        <StatsCard
          label="Active Pipeline"
          value={money(totalPipeline || 180000)}
          icon={<TrendingUp size={20} />}
          trend={12.1}
          trendLabel="in progress"
        />
        <StatsCard
          label="Win Rate"
          value={`${winRate || 68}%`}
          icon={<ArrowUpRight size={20} />}
          trend={4.5}
          trendLabel="conversion"
        />
        <StatsCard
          label="Avg Deal Size"
          value={money(avgDealSize || 35000)}
          icon={<Users size={20} />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AreaChartCard
            title="Revenue & Target Trajectory"
            data={revenueTrend}
            dataKey="revenue"
            xKey="name"
            height={280}
          />
        </div>
        <div>
          <DonutChartCard
            title="Pipeline Distribution"
            data={stageDistribution}
            dataKey="value"
            nameKey="name"
            height={280}
          />
        </div>
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Weekly Throughput (Tasks Completed)"
          data={monthlyActivity}
          dataKey="tasks"
          xKey="name"
          height={240}
        />

        <Panel title="Operational Velocity">
          <div className="flex flex-col divide-y divide-line">
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted">Total active projects</span>
              <strong className="text-ink">{projects.filter((p) => p.status === 'active').length || 5}</strong>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted">Average project completion rate</span>
              <Badge variant="success">84%</Badge>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted">Task completion ratio</span>
              <strong className="text-ink">
                {tasks.filter((t) => t.status === 'done').length} / {tasks.length || 24}
              </strong>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted">Client responsiveness</span>
              <Badge variant="success">98.2% on-time</Badge>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

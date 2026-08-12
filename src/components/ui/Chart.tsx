import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

const COLORS = ['#087f5b', '#0ca678', '#38d9a9', '#96f2d7', '#c3fae8', '#066246']

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-md">
      {label ? <p className="mb-1 font-bold text-ink">{label}</p> : null}
      {payload.map((entry, i) => (
        <p key={i} className="text-muted">
          <span className="font-semibold text-ink">{entry.value.toLocaleString()}</span>{' '}
          {entry.name}
        </p>
      ))}
    </div>
  )
}

export function AreaChartCard({
  title,
  data,
  dataKey,
  xKey = 'name',
  height = 240,
  action,
  className = '',
}: {
  title: string
  data: Array<Record<string, unknown>>
  dataKey: string
  xKey?: string
  height?: number
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#087f5b" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#087f5b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#dfe4df" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#67736c' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#67736c' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey={dataKey} stroke="#087f5b" strokeWidth={2} fill="url(#areaGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarChartCard({
  title,
  data,
  dataKey,
  xKey = 'name',
  height = 240,
  action,
  className = '',
}: {
  title: string
  data: Array<Record<string, unknown>>
  dataKey: string
  xKey?: string
  height?: number
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dfe4df" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#67736c' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#67736c' }} axisLine={false} tickLine={false} width={40} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} fill="#087f5b" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DonutChartCard({
  title,
  data,
  dataKey = 'value',
  nameKey = 'name',
  height = 240,
  action,
  className = '',
}: {
  title: string
  data: Array<Record<string, unknown>>
  dataKey?: string
  nameKey?: string
  height?: number
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {data.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            {String(item[nameKey])}
          </span>
        ))}
      </div>
    </div>
  )
}

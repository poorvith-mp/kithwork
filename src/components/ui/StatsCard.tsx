import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'

export function StatsCard({
  label,
  value,
  icon,
  trend,
  trendLabel,
  sparklineData,
  className = '',
}: {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: number
  trendLabel?: string
  sparklineData?: number[]
  className?: string
}) {
  const isPositive = trend !== undefined && trend >= 0
  const trendBg = isPositive ? 'bg-accent-soft text-accent-strong' : 'bg-danger-soft text-danger'

  // Generate SVG path from sparkline numbers
  const sparklinePoints = sparklineData || [10, 18, 14, 25, 22, 35, 30, 42]
  const min = Math.min(...sparklinePoints)
  const max = Math.max(...sparklinePoints)
  const range = max - min || 1
  const width = 100
  const height = 28
  const points = sparklinePoints
    .map((v, i) => {
      const x = (i / (sparklinePoints.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-card transition-all hover:shadow-md hover:-translate-y-0.5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-wider text-muted truncate">
            {label}
          </p>
          <p className="text-2xl font-extrabold tracking-tight text-ink truncate">
            {value}
          </p>
        </div>
        {icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform group-hover:scale-105">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {trend !== undefined ? (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-extrabold ${trendBg}`}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{isPositive ? '+' : ''}{trend}%</span>
            </span>
            {trendLabel ? (
              <span className="text-[0.7rem] font-medium text-muted">{trendLabel}</span>
            ) : null}
          </div>
        ) : <div />}

        {/* Mini SVG Sparkline */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-7 w-20 shrink-0 stroke-accent fill-none opacity-60 group-hover:opacity-100 transition-opacity"
          aria-hidden="true"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    </div>
  )
}

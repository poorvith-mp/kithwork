import { useState, useMemo } from 'react'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type CalendarEvent = {
  date: Date | string
  color?: string
}

export function CalendarWidget({
  events = [],
  onDateClick,
  className = '',
}: {
  events?: CalendarEvent[]
  onDateClick?: (date: Date) => void
  className?: string
}) {
  const [current, setCurrent] = useState(new Date())
  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventDates = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) {
      const d = typeof e.date === 'string' ? new Date(e.date) : e.date
      set.add(format(d, 'yyyy-MM-dd'))
    }
    return set
  }, [events])

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

  return (
    <div className={`rounded-xl border border-line bg-surface p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrent((c) => subMonths(c, 1))}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-ink transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-sm font-bold">{format(current, 'MMMM yyyy')}</h3>
        <button
          type="button"
          onClick={() => setCurrent((c) => addMonths(c, 1))}
          className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-ink transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {weekDays.map((d) => (
          <span key={d} className="pb-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, current)
          const today = isToday(day)
          const hasEvent = eventDates.has(format(day, 'yyyy-MM-dd'))

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateClick?.(day)}
              className={`relative grid size-8 place-items-center rounded-md text-xs font-medium transition-colors ${
                !inMonth
                  ? 'text-muted/40'
                  : today
                    ? 'bg-accent text-white font-bold'
                    : 'text-ink hover:bg-surface-muted'
              }`}
            >
              {day.getDate()}
              {hasEvent ? (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-accent" />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

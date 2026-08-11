const IST_OFFSET_MS = 330 * 60 * 1000

export type AvailabilityRule = {
  weekday: number
  enabled: boolean
  start_time: string
  end_time: string
  break_start: string | null
  break_end: string | null
}

export type AvailabilityPeriod = { start_at: string; end_at: string }
export type AvailabilitySlot = { start: string; end: string }

function istParts(date: Date) {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  }
}

function utcFromIst(year: number, month: number, day: number, hour: number, minute: number) {
  return new Date(Date.UTC(year, month, day, hour, minute) - IST_OFFSET_MS)
}

function minutes(value: string) {
  const [hour = 0, minute = 0] = value.split(':').map(Number)
  return hour * 60 + minute
}

function dateKey(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function findFirstAvailableWeek(input: {
  now: Date
  rules: AvailabilityRule[]
  busy: AvailabilityPeriod[]
  activeRequests: AvailabilityPeriod[]
  dailyLimit: number
  slotMinutes: number
  maxWeeks: number
  minimumLeadHours: number
}): { weeksSearched: number; weekStart: string | null; slots: AvailabilitySlot[] } {
  const base = istParts(input.now)
  const earliest = new Date(input.now.getTime() + input.minimumLeadHours * 60 * 60 * 1000)
  const rules = new Map(input.rules.map((rule) => [rule.weekday, rule]))
  const slotMilliseconds = input.slotMinutes * 60 * 1000

  for (let weekIndex = 0; weekIndex < input.maxWeeks; weekIndex += 1) {
    const weekStartDate = utcFromIst(base.year, base.month, base.day + weekIndex * 7, 0, 0)
    const weekStart = dateKey(istParts(weekStartDate))
    const slots: AvailabilitySlot[] = []

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const localDate = utcFromIst(base.year, base.month, base.day + weekIndex * 7 + dayOffset, 12, 0)
      const local = istParts(localDate)
      const weekday = new Date(Date.UTC(local.year, local.month, local.day)).getUTCDay()
      const rule = rules.get(weekday)
      if (!rule?.enabled) continue

      const requestCount = input.activeRequests.filter((period) => {
        const value = istParts(new Date(period.start_at))
        return value.year === local.year && value.month === local.month && value.day === local.day
      }).length
      let remaining = Math.max(0, input.dailyLimit - requestCount)
      if (!remaining) continue

      const startMinute = minutes(rule.start_time)
      const endMinute = minutes(rule.end_time)
      const breakStart = rule.break_start ? minutes(rule.break_start) : null
      const breakEnd = rule.break_end ? minutes(rule.break_end) : null

      for (let minute = startMinute; minute + input.slotMinutes <= endMinute && remaining > 0; minute += input.slotMinutes) {
        if (breakStart !== null && breakEnd !== null && minute < breakEnd && minute + input.slotMinutes > breakStart) continue
        const start = utcFromIst(local.year, local.month, local.day, Math.floor(minute / 60), minute % 60)
        const end = new Date(start.getTime() + slotMilliseconds)
        if (start < earliest) continue
        if (input.busy.some((period) => new Date(period.start_at) < end && new Date(period.end_at) > start)) continue
        slots.push({ start: start.toISOString(), end: end.toISOString() })
        remaining -= 1
      }
    }

    if (slots.length > 0) return { weeksSearched: weekIndex + 1, weekStart, slots }
  }

  return { weeksSearched: input.maxWeeks, weekStart: null, slots: [] }
}

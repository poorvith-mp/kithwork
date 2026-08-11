import { describe, expect, it } from 'vitest'

import { findFirstAvailableWeek } from '../../supabase/functions/_shared/availability'

describe('public availability search', () => {
  it('skips empty seven-day windows and returns the next available week', () => {
    const result = findFirstAvailableWeek({
      now: new Date('2026-08-10T03:30:00.000Z'),
      rules: [{ weekday: 1, enabled: true, start_time: '09:00', end_time: '09:30', break_start: null, break_end: null }],
      busy: [{ start_at: '2026-08-10T03:30:00.000Z', end_at: '2026-08-10T04:00:00.000Z' }],
      activeRequests: [{ start_at: '2026-08-10T03:30:00.000Z', end_at: '2026-08-10T04:00:00.000Z' }],
      dailyLimit: 5,
      slotMinutes: 30,
      maxWeeks: 8,
      minimumLeadHours: 2,
    })

    expect(result.weeksSearched).toBe(2)
    expect(result.weekStart).toBe('2026-08-17')
    expect(result.slots).toEqual([{
      start: '2026-08-17T03:30:00.000Z',
      end: '2026-08-17T04:00:00.000Z',
    }])
  })

  it('returns an empty successful horizon without inventing slots', () => {
    const result = findFirstAvailableWeek({
      now: new Date('2026-08-10T03:30:00.000Z'),
      rules: [],
      busy: [],
      activeRequests: [],
      dailyLimit: 5,
      slotMinutes: 30,
      maxWeeks: 8,
      minimumLeadHours: 2,
    })

    expect(result).toEqual({ weeksSearched: 8, weekStart: null, slots: [] })
  })
})

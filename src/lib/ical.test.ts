import { describe, expect, it } from 'vitest';
import { formatIcsDate, generateIcalFeed } from './ical';

describe('iCalendar generator (PMP-27)', () => {
  it('formats dates in UTC RFC 5545 format', () => {
    const date = new Date('2026-09-01T10:30:00.000Z');
    expect(formatIcsDate(date)).toBe('20260901T103000Z');
  });

  it('generates compliant VCALENDAR feed with VEVENT records', () => {
    const events = [
      {
        id: 'evt-1',
        title: 'Project Kickoff Meeting',
        description: 'Discuss milestones and deliverables',
        startTime: '2026-09-01T10:00:00.000Z',
        endTime: '2026-09-01T11:00:00.000Z',
        location: 'Bangalore Studio',
      },
    ];

    const feed = generateIcalFeed(events, 'Kithwork Schedule');
    expect(feed).toContain('BEGIN:VCALENDAR');
    expect(feed).toContain('VERSION:2.0');
    expect(feed).toContain('X-WR-CALNAME:Kithwork Schedule');
    expect(feed).toContain('BEGIN:VEVENT');
    expect(feed).toContain('UID:evt-1@kithwork.local');
    expect(feed).toContain('DTSTART:20260901T100000Z');
    expect(feed).toContain('DTEND:20260901T110000Z');
    expect(feed).toContain('SUMMARY:Project Kickoff Meeting');
    expect(feed).toContain('END:VEVENT');
    expect(feed).toContain('END:VCALENDAR');
  });
});

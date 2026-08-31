export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date | string;
  endTime?: Date | string;
  location?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export function formatIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateIcalFeed(events: CalendarEvent[], calName: string = 'Kithwork Calendar'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//poorvith-mp//Kithwork//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
  ];

  const now = formatIcsDate(new Date());

  for (const ev of events) {
    const start = new Date(ev.startTime);
    const end = ev.endTime ? new Date(ev.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@kithwork.local`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${formatIcsDate(start)}`);
    lines.push(`DTEND:${formatIcsDate(end)}`);
    lines.push(`SUMMARY:${ev.title.replace(/\n/g, ' ')}`);
    if (ev.description) lines.push(`DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`);
    if (ev.location) lines.push(`LOCATION:${ev.location.replace(/\n/g, ' ')}`);
    lines.push(`STATUS:${ev.status || 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

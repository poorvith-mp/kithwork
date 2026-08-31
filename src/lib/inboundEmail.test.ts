import { describe, expect, it } from 'vitest';
import { parseInboundEmail } from './inboundEmail';

describe('Inbound Email Webhook Parser (PMP-26)', () => {
  it('parses formatted sender with display name into structured enquiry', () => {
    const payload = {
      from: 'Alice Sharma <alice@example.com>',
      to: 'inbox@kithwork.poorvithmp.com',
      subject: 'New Commission Enquiry',
      text: 'Interested in booking architecture consulting for Q4.',
    };

    const parsed = parseInboundEmail(payload);
    expect(parsed.senderEmail).toBe('alice@example.com');
    expect(parsed.senderName).toBe('Alice Sharma');
    expect(parsed.subject).toBe('New Commission Enquiry');
    expect(parsed.body).toBe('Interested in booking architecture consulting for Q4.');
    expect(parsed.source).toBe('email_webhook');
  });

  it('handles bare email address without display name', () => {
    const payload = {
      from: 'dev@company.org',
      to: 'inbox@kithwork.poorvithmp.com',
      subject: 'Collaboration request',
      text: 'Let us connect regarding open source integration.',
    };

    const parsed = parseInboundEmail(payload);
    expect(parsed.senderEmail).toBe('dev@company.org');
    expect(parsed.senderName).toBeUndefined();
  });
});

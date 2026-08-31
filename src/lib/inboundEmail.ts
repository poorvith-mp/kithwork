export interface InboundEmailPayload {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
}

export interface ParsedEnquiry {
  senderEmail: string;
  senderName?: string;
  subject: string;
  body: string;
  source: 'email_webhook';
  receivedAt: string;
}

export function parseInboundEmail(payload: InboundEmailPayload): ParsedEnquiry {
  const from = payload.from || '';
  const nameMatch = from.match(/^"?([^"<]+)"?\s*<([^>]+)>/);
  const senderEmail = (nameMatch && nameMatch[2]) ? nameMatch[2].trim() : from.trim();
  const senderName = (nameMatch && nameMatch[1]) ? nameMatch[1].trim() : undefined;

  return {
    senderEmail,
    senderName,
    subject: payload.subject || '(No subject)',
    body: (payload.text || payload.html || '').trim(),
    source: 'email_webhook',
    receivedAt: new Date().toISOString(),
  };
}

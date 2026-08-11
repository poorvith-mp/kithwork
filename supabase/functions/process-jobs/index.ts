import { serviceClient } from '../_shared/supabase.ts'

const RESEND_URL = 'https://api.resend.com/emails'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const expected = Deno.env.get('CRON_SECRET')
  if (!expected || req.headers.get('x-cron-secret') !== expected) return new Response('Unauthorized', { status: 401 })
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return new Response('RESEND_API_KEY is missing', { status: 503 })
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')?.trim()
  if (!fromEmail) return new Response('RESEND_FROM_EMAIL is missing', { status: 503 })

  const db = serviceClient()
  await db.rpc('prepare_due_reminders')
  const { data: owner } = await db.from('owner_settings').select('owner_id,resend_daily_limit,transactional_reserve').order('created_at').limit(1).single()
  if (!owner) return new Response('Owner not configured', { status: 503 })
  const dayStartUtc = new Date()
  dayStartUtc.setUTCHours(0, 0, 0, 0)
  const { count } = await db.from('email_outbox').select('*', { count: 'exact', head: true }).eq('owner_id', owner.owner_id).eq('status', 'sent').gte('updated_at', dayStartUtc.toISOString())
  let sentToday = count ?? 0
  const { data: jobs, error } = await db.rpc('claim_due_email_jobs', { p_limit: 25 })
  if (error) return new Response(error.message, { status: 500 })
  let sent = 0
  let failed = 0

  for (const job of jobs ?? []) {
    const isCampaign = job.kind === 'campaign'
    const limit = isCampaign ? Number(owner.resend_daily_limit) - Number(owner.transactional_reserve) : Number(owner.resend_daily_limit)
    if (sentToday >= limit) {
      const tomorrow = new Date(dayStartUtc.getTime() + 24 * 60 * 60 * 1000)
      await db.from('email_outbox').update({ status: 'pending', send_after: tomorrow.toISOString(), last_error: 'Daily allowance deferred this email' }).eq('id', job.id)
      continue
    }
    const { data: suppressed } = await db.from('suppressions').select('id').eq('owner_id', job.owner_id).eq('email', job.recipient_email.toLowerCase()).maybeSingle()
    if (suppressed) {
      await db.from('email_outbox').update({ status: 'cancelled', last_error: 'Recipient is suppressed' }).eq('id', job.id)
      continue
    }
    try {
      const response = await fetch(RESEND_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': job.idempotency_key },
        body: JSON.stringify({ from: fromEmail, to: [job.recipient_email], subject: job.subject, text: job.body_text, reply_to: job.reply_to || undefined }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || `Resend returned ${response.status}`)
      await db.from('email_outbox').update({ status: 'sent', provider_message_id: result.id, last_error: null }).eq('id', job.id)
      if (job.message_id) await db.from('messages').update({ status: 'sent', provider_message_id: result.id, sent_at: new Date().toISOString() }).eq('id', job.message_id)
      if (job.kind === 'appointment_reminder' && job.idempotency_key.startsWith('reminder-')) {
        await db.from('reminder_jobs').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', job.idempotency_key.slice(9))
      }
      sent += 1
      sentToday += 1
    } catch (value) {
      const message = value instanceof Error ? value.message.slice(0, 1000) : 'Email delivery failed'
      await db.from('email_outbox').update({ status: job.attempts >= 3 ? 'failed' : 'pending', send_after: new Date(Date.now() + Math.min(job.attempts * 15, 60) * 60000).toISOString(), last_error: message }).eq('id', job.id)
      if (job.attempts >= 3 && job.kind === 'appointment_reminder' && job.idempotency_key.startsWith('reminder-')) {
        await db.from('reminder_jobs').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', job.idempotency_key.slice(9))
      }
      if(job.attempts>=3)await db.from('notifications').insert({owner_id:job.owner_id,kind:'email_failed',title:'Email delivery failed',body:`${job.recipient_email}: ${message}`,href:'/inbox'})
      failed += 1
    }
  }
  await db.rpc('purge_expired_trash')
  return Response.json({ ok: true, claimed: jobs?.length ?? 0, sent, failed })
})

import { Megaphone, Plus, ShieldCheck } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InputField, TextareaField } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { Panel } from '@/components/ui/Panel'
import { StatsCard } from '@/components/ui/StatsCard'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { insertRow, shortDate, updateRow } from '@/lib/data'
import { supabase } from '@/lib/supabase'

type Consent = { id: string; person_id: string; state: string; created_at: string }
type Person = { id: string; first_name: string; last_name: string | null; email: string | null }
type Suppression = { id: string; email: string; reason: string }
type Campaign = {
  id: string
  name: string
  subject: string
  body_text: string
  status: string
  scheduled_at: string | null
  created_at: string
}

export function MarketingPage() {
  const { user } = useAuth()
  const { data: consents } = useRows<Consent>('marketing_consents', 'created_at', false)
  const { data: people } = useRows<Person>('people')
  const { data: suppressions } = useRows<Suppression>('suppressions', 'created_at', false)
  const { data: campaigns, refresh } = useRows<Campaign>('campaigns')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', body_text: '', scheduled_at: '' })

  const latest = useMemo(() => {
    const map = new Map<string, Consent>()
    for (const item of consents) if (!map.has(item.person_id)) map.set(item.person_id, item)
    return map
  }, [consents])

  const audience = people.filter(
    (person) =>
      person.email &&
      latest.get(person.id)?.state === 'subscribed' &&
      !suppressions.some((item) => item.email === person.email?.toLowerCase()),
  )

  const save = async (e: FormEvent) => {
    e.preventDefault()
    await insertRow('campaigns', {
      owner_id: user!.id,
      ...form,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      status: 'draft',
    })
    setOpen(false)
    setForm({ name: '', subject: '', body_text: '', scheduled_at: '' })
    await refresh()
  }

  const queue = async (campaign: Campaign) => {
    if (!confirm(`Queue this campaign for ${audience.length} consented contacts?`)) return
    for (const person of audience) {
      await supabase.from('campaign_recipients').upsert(
        {
          owner_id: user!.id,
          campaign_id: campaign.id,
          person_id: person.id,
          email: person.email,
          status: 'queued',
        },
        { onConflict: 'campaign_id,person_id' },
      )
      await supabase.from('email_outbox').upsert(
        {
          owner_id: user!.id,
          kind: 'campaign',
          recipient_email: person.email,
          subject: campaign.subject,
          body_text: `${campaign.body_text}\n\nTo stop promotional emails, reply with “unsubscribe”.`,
          send_after: campaign.scheduled_at ?? new Date().toISOString(),
          idempotency_key: `campaign-${campaign.id}-${person.id}`,
        },
        { onConflict: 'idempotency_key' },
      )
    }
    await updateRow('campaigns', campaign.id, {
      status: campaign.scheduled_at ? 'scheduled' : 'sending',
    })
    await refresh()
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Consent-first outreach"
        title="Marketing"
        description="Only contacts with recorded consent and no suppression can receive a campaign."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} />
            <span>New campaign</span>
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Eligible contacts" value={audience.length} />
        <StatsCard label="Suppressed contacts" value={suppressions.length} />
        <StatsCard label="Daily marketing allowance" value="200" />
        <StatsCard label="Reserved service emails" value="100" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Campaigns">
          <div className="flex flex-col divide-y divide-line">
            {campaigns.length ? (
              campaigns.map((item) => (
                <div className="flex items-center gap-3 py-3 text-sm" key={item.id}>
                  <Megaphone size={18} className="text-accent" />
                  <div className="flex-1 min-w-0">
                    <strong className="block font-semibold truncate">{item.name}</strong>
                    <small className="text-xs text-muted truncate block">
                      {item.subject} · {shortDate(item.scheduled_at ?? item.created_at)}
                    </small>
                  </div>
                  <Badge variant={item.status === 'sent' ? 'success' : 'default'}>
                    {item.status}
                  </Badge>
                  {item.status === 'draft' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!audience.length}
                      onClick={() => void queue(item)}
                    >
                      Queue
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-center text-muted">
                <Megaphone size={32} className="mb-2 opacity-40 text-accent" />
                <p className="text-sm">No campaigns yet.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Eligible audience">
          <div className="flex flex-col divide-y divide-line">
            {audience.map((person) => (
              <div className="flex items-center gap-3 py-3 text-sm" key={person.id}>
                <ShieldCheck size={17} className="text-accent" />
                <div className="flex-1">
                  <strong className="block font-semibold">
                    {person.first_name} {person.last_name}
                  </strong>
                  <small className="text-xs text-muted">{person.email}</small>
                </div>
              </div>
            ))}
            {!audience.length ? (
              <div className="py-8 text-center text-sm text-muted">
                <p>No subscribed contacts are currently eligible.</p>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>

      {/* Campaign Drawer */}
      <Drawer title="New marketing campaign" open={open} onClose={() => setOpen(false)}>
        <form className="flex flex-col gap-4" onSubmit={save}>
          <InputField
            label="Internal name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <InputField
            label="Email subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />
          <TextareaField
            label="Message"
            value={form.body_text}
            onChange={(e) => setForm({ ...form, body_text: e.target.value })}
            required
          />
          <InputField
            label="Optional scheduled time"
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          />
          <Button type="submit">Save draft</Button>
        </form>
      </Drawer>
    </div>
  )
}

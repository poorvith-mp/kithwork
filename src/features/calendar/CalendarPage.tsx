import { Ban, CalendarCheck, Check, Clock3, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { InputField, TextareaField } from '@/components/ui/Field'
import { Drawer, Modal } from '@/components/ui/Overlay'
import { Panel } from '@/components/ui/Panel'
import { StatsCard } from '@/components/ui/StatsCard'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { insertRow, updateRow } from '@/lib/data'
import { supabase } from '@/lib/supabase'

import { AppointmentDeliveryState } from './AppointmentDeliveryState'

type Slot = {
  id: string
  person_id: string
  start_at: string
  end_at: string
  visitor_timezone: string
  status: string
}
type Appointment = {
  id: string
  person_id: string
  start_at: string
  end_at: string
  status: 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
}
type Person = { id: string; first_name: string; last_name: string | null; email: string | null }
type Block = { id: string; title: string; start_at: string; end_at: string }
type Rule = {
  id: string
  weekday: number
  enabled: boolean
  start_time: string
  end_time: string
  break_start: string | null
  break_end: string | null
}
type EmailJob = {
  id: string
  kind: string
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
  last_error: string | null
  idempotency_key: string
  created_at: string
}

const format = (value: string, timezone: string) =>
  new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  })

export function CalendarPage() {
  const { user, profile } = useAuth()
  const timezone = profile?.timezone ?? 'UTC'
  const { data: requests, refresh: refreshRequests } = useRows<Slot>(
    'slot_requests',
    'start_at',
    false,
  )
  const { data: appointments, refresh: refreshAppointments } = useRows<Appointment>(
    'appointments',
    'start_at',
    false,
  )
  const { data: people } = useRows<Person>('people')
  const { data: blocks, refresh: refreshBlocks } = useRows<Block>(
    'blocked_periods',
    'start_at',
    false,
  )
  const { data: rules, refresh: refreshRules } = useRows<Rule>(
    'availability_rules',
    'weekday',
    false,
  )
  const { data: emailJobs, refresh: refreshEmailJobs } = useRows<EmailJob>(
    'email_outbox',
    'created_at',
    false,
  )
  const [blockOpen, setBlockOpen] = useState(false)
  const [decision, setDecision] = useState<Slot | null>(null)
  const [note, setNote] = useState('')
  const [block, setBlock] = useState({ title: 'Unavailable', start_at: '', end_at: '', notes: '' })

  const person = (id: string) => {
    const value = people.find((item) => item.id === id)
    return value ? `${value.first_name} ${value.last_name ?? ''}`.trim() : 'Client'
  }
  const confirmationJob = (appointmentId: string) =>
    emailJobs.find(
      (job) =>
        job.kind === 'appointment_confirmation' &&
        job.idempotency_key === `appointment-confirmation-${appointmentId}`,
    ) ?? null

  const approve = async () => {
    if (!decision) return
    const { error } = await supabase.rpc('approve_slot_request', {
      p_request_id: decision.id,
      p_owner_note: note || null,
    })
    if (error) alert(error.message)
    else {
      setDecision(null)
      setNote('')
      await Promise.all([refreshRequests(), refreshAppointments(), refreshEmailJobs()])
    }
  }

  const decline = async () => {
    if (!decision || !note.trim()) return
    const { error } = await supabase.rpc('decline_slot_request', {
      p_request_id: decision.id,
      p_owner_note: note,
    })
    if (error) alert(error.message)
    else {
      setDecision(null)
      setNote('')
      await refreshRequests()
    }
  }

  const retryEmail = async (jobId: string) => {
    const { error } = await supabase.rpc('retry_email_job', { p_job_id: jobId })
    if (error) alert(error.message)
    else await refreshEmailJobs()
  }

  const addBlock = async (event: FormEvent) => {
    event.preventDefault()
    await insertRow('blocked_periods', {
      owner_id: user!.id,
      title: block.title,
      start_at: new Date(block.start_at).toISOString(),
      end_at: new Date(block.end_at).toISOString(),
      notes: block.notes || null,
    })
    setBlockOpen(false)
    setBlock({ title: 'Unavailable', start_at: '', end_at: '', notes: '' })
    await refreshBlocks()
  }

  const reschedule = async (item: Appointment) => {
    const value = prompt('New date and time in your device timezone (example: 2026-08-20T10:00)', '')
    if (!value) return
    const apology =
      prompt(
        'Edit the date-change message that will be emailed to the client.',
        'I am sorry for the inconvenience. Your conversation date has changed. Please reply if the new time does not work for you.',
      ) || ''
    const start = new Date(value).toISOString()
    const { error } = await supabase.rpc('reschedule_appointment', {
      p_appointment_id: item.id,
      p_start_at: start,
      p_note: apology,
    })
    if (error) return alert(error.message)
    const target = people.find((candidate) => candidate.id === item.person_id)
    if (target?.email) {
      await insertRow('email_outbox', {
        owner_id: user!.id,
        kind: 'appointment_change',
        recipient_email: target.email,
        subject: 'Conversation date changed',
        body_text: `${apology}\n\nNew date: ${format(start, timezone)} (${timezone})`,
        send_after: new Date().toISOString(),
        idempotency_key: `appointment-change-${item.id}-${crypto.randomUUID()}`,
      })
    }
    await Promise.all([refreshAppointments(), refreshEmailJobs()])
  }

  const pendingRequests = requests.filter((item) => item.status === 'pending')
  const upcomingAppointments = appointments.filter(
    (item) => item.status === 'confirmed' && new Date(item.end_at) > new Date(),
  )

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Scheduling"
        title="Calendar"
        description={`Times are shown in ${timezone}. Each visitor timezone is kept with its request.`}
        actions={
          <Button onClick={() => setBlockOpen(true)}>
            <Plus size={16} />
            <span>Block time</span>
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Pending requests" value={pendingRequests.length} />
        <StatsCard label="Upcoming conversations" value={upcomingAppointments.length} />
        <StatsCard
          label="Active blocks"
          value={blocks.filter((item) => new Date(item.end_at) > new Date()).length}
        />
        <StatsCard label="Workspace timezone" value={timezone} />
      </div>

      {/* Primary Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Conversation requests">
          <div className="flex flex-col divide-y divide-line">
            {pendingRequests.length ? (
              pendingRequests.map((item) => (
                <div className="flex items-center gap-3 py-3 text-sm" key={item.id}>
                  <Clock3 size={18} className="text-muted" />
                  <div className="flex-1">
                    <strong className="block font-semibold">{person(item.person_id)}</strong>
                    <small className="text-xs text-muted">
                      {format(item.start_at, timezone)} · visitor: {item.visitor_timezone}
                    </small>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setDecision(item)
                      setNote('')
                    }}
                  >
                    Review
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-center text-muted">
                <CalendarCheck size={32} className="mb-2 opacity-40 text-accent" />
                <p className="text-sm">No pending slot requests.</p>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Upcoming appointments">
          <div className="flex flex-col divide-y divide-line">
            {upcomingAppointments.length ? (
              upcomingAppointments.map((item) => (
                <div className="py-3" key={item.id}>
                  <div className="flex items-center gap-3 text-sm">
                    <Check size={18} className="text-accent" />
                    <div className="flex-1">
                      <strong className="block font-semibold">{person(item.person_id)}</strong>
                      <small className="text-xs text-muted">{format(item.start_at, timezone)}</small>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => void reschedule(item)}>
                      Reschedule
                    </Button>
                  </div>
                  <AppointmentDeliveryState
                    appointmentStatus={item.status}
                    emailJob={confirmationJob(item.id)}
                    onRetry={(jobId) => void retryEmail(jobId)}
                  />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-8 text-center text-muted">
                <CalendarCheck size={32} className="mb-2 opacity-40 text-accent" />
                <p className="text-sm">No upcoming appointments.</p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Weekly availability">
          <div className="flex flex-col divide-y divide-line">
            {[...rules]
              .sort((a, b) => a.weekday - b.weekday)
              .map((rule) => (
                <div className="flex items-center gap-3 py-3 text-sm" key={rule.id}>
                  <div className="flex-1">
                    <strong className="block font-semibold">
                      {
                        [
                          'Sunday',
                          'Monday',
                          'Tuesday',
                          'Wednesday',
                          'Thursday',
                          'Friday',
                          'Saturday',
                        ][rule.weekday]
                      }
                    </strong>
                    <small className="text-xs text-muted">
                      {rule.enabled
                        ? `${rule.start_time.slice(0, 5)}–${rule.end_time.slice(0, 5)} · break ${rule.break_start?.slice(0, 5)}–${rule.break_end?.slice(0, 5)}`
                        : 'Unavailable'}
                    </small>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await updateRow('availability_rules', rule.id, {
                        enabled: !rule.enabled,
                      })
                      await refreshRules()
                    }}
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              ))}
          </div>
        </Panel>

        <Panel title="Manual blocks">
          <div className="flex flex-col divide-y divide-line">
            {blocks
              .filter((item) => new Date(item.end_at) > new Date())
              .map((item) => (
                <div className="flex items-center gap-3 py-3 text-sm" key={item.id}>
                  <Ban size={16} className="text-danger" />
                  <div className="flex-1">
                    <strong className="block font-semibold">{item.title}</strong>
                    <small className="text-xs text-muted">
                      {format(item.start_at, timezone)} – {format(item.end_at, timezone)}
                    </small>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={async () => {
                      await supabase.from('blocked_periods').delete().eq('id', item.id)
                      await refreshBlocks()
                    }}
                  >
                    <X size={15} />
                  </Button>
                </div>
              ))}
          </div>
        </Panel>
      </div>

      {/* Block Drawer */}
      <Drawer
        title="Block calendar time"
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={addBlock}>
          <InputField
            label="Title"
            value={block.title}
            onChange={(event) => setBlock({ ...block, title: event.target.value })}
            required
          />
          <InputField
            label="Starts (your local device time)"
            type="datetime-local"
            value={block.start_at}
            onChange={(event) => setBlock({ ...block, start_at: event.target.value })}
            required
          />
          <InputField
            label="Ends"
            type="datetime-local"
            value={block.end_at}
            onChange={(event) => setBlock({ ...block, end_at: event.target.value })}
            required
          />
          <TextareaField
            label="Notes"
            value={block.notes}
            onChange={(event) => setBlock({ ...block, notes: event.target.value })}
          />
          <Button type="submit">Save block</Button>
        </form>
      </Drawer>

      {/* Decision Modal */}
      <Modal
        title="Review slot request"
        open={Boolean(decision)}
        onClose={() => setDecision(null)}
      >
        <div className="flex flex-col gap-4">
          {decision ? (
            <>
              <div>
                <strong className="text-base font-bold">{person(decision.person_id)}</strong>
                <p className="text-sm text-muted">{format(decision.start_at, timezone)}</p>
              </div>
              <TextareaField
                label="Decision note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Required when declining; optional when approving."
              />
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => void approve()}>
                  Approve
                </Button>
                <Button
                  className="flex-1"
                  variant="danger"
                  disabled={!note.trim()}
                  onClick={() => void decline()}
                >
                  Decline
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}

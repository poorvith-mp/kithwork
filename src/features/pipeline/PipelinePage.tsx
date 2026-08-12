import { BriefcaseBusiness, DollarSign, Plus, Trophy } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InputField, SelectField, TextareaField } from '@/components/ui/Field'
import { Drawer, Modal } from '@/components/ui/Overlay'
import { StatsCard } from '@/components/ui/StatsCard'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { insertRow, money, shortDate, updateRow } from '@/lib/data'
import { supabase } from '@/lib/supabase'
import type { Opportunity, OpportunityStage, Person } from '@/types/domain'

const stages: OpportunityStage[] = [
  'discovery',
  'proposal',
  'negotiation',
  'won',
  'lost',
  'on_hold',
]

const empty = {
  title: '',
  person_id: '',
  service_interest: '',
  stage: 'discovery' as OpportunityStage,
  expected_value: '',
  probability: '',
  expected_close_date: '',
  next_action: '',
  next_action_due_at: '',
  notes: '',
}

export function PipelinePage() {
  const { user } = useAuth()
  const { data, loading, error, refresh } = useRows<Opportunity>('opportunities')
  const { data: people } = useRows<Person>('people')
  const [form, setForm] = useState(empty)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const [move, setMove] = useState<{ item: Opportunity; stage: OpportunityStage } | null>(null)
  const [reason, setReason] = useState('')

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        stages.map((stage) => [stage, data.filter((item) => item.stage === stage)]),
      ),
    [data],
  )

  const totalValue = useMemo(
    () =>
      data
        .filter((item) => !['won', 'lost'].includes(item.stage))
        .reduce((sum, item) => sum + (item.expected_value ?? 0), 0),
    [data],
  )

  const wonValue = useMemo(
    () =>
      data
        .filter((item) => item.stage === 'won')
        .reduce((sum, item) => sum + (item.expected_value ?? 0), 0),
    [data],
  )

  const edit = (item?: Opportunity) => {
    setSelected(item ?? null)
    setForm(
      item
        ? {
            title: item.title,
            person_id: item.person_id,
            service_interest: item.service_interest ?? '',
            stage: item.stage,
            expected_value: item.expected_value?.toString() ?? '',
            probability: item.probability?.toString() ?? '',
            expected_close_date: item.expected_close_date ?? '',
            next_action: item.next_action ?? '',
            next_action_due_at: item.next_action_due_at?.slice(0, 16) ?? '',
            notes: item.notes ?? '',
          }
        : empty,
    )
    setOpen(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const value = {
      ...form,
      owner_id: user!.id,
      expected_value: form.expected_value ? Number(form.expected_value) : null,
      probability: form.probability ? Number(form.probability) : null,
      expected_close_date: form.expected_close_date || null,
      next_action_due_at: form.next_action_due_at
        ? new Date(form.next_action_due_at).toISOString()
        : null,
    }
    if (selected) await updateRow('opportunities', selected.id, value)
    else await insertRow('opportunities', value)
    setOpen(false)
    await refresh()
  }

  const change = async () => {
    if (!move) return
    const { error: moveError } = await supabase.rpc('change_opportunity_stage', {
      p_opportunity_id: move.item.id,
      p_stage: move.stage,
      p_reason: reason || null,
    })
    if (moveError) alert(moveError.message)
    else {
      setMove(null)
      setReason('')
      await refresh()
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Sales"
        title="Pipeline"
        description="Every opportunity has a clear stage, value, and next action."
        actions={
          <Button onClick={() => edit()} disabled={!people.length}>
            <Plus size={16} />
            <span>Add opportunity</span>
          </Button>
        }
      />

      {!people.length ? (
        <div className="mb-4 rounded-lg border border-line bg-accent-soft p-3 text-sm text-accent-strong">
          Add a person before creating an opportunity.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {/* KPI Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard
          label="Open pipeline"
          value={money(totalValue)}
          icon={<DollarSign size={20} />}
        />
        <StatsCard
          label="Won deals"
          value={money(wonValue)}
          icon={<Trophy size={20} />}
          trend={100}
          trendLabel="closed"
        />
        <StatsCard
          label="Active opportunities"
          value={data.filter((i) => !['won', 'lost'].includes(i.stage)).length}
          icon={<BriefcaseBusiness size={20} />}
        />
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((s) => (
            <div key={s} className="h-64 rounded-xl border border-line bg-surface-muted/50 p-4 skeleton-shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-x-auto pb-4 sm:grid-cols-2 lg:grid-cols-6 min-w-[768px]">
          {stages.map((stage) => {
            const items = grouped[stage] ?? []
            const stageTotal = items.reduce((s, i) => s + (i.expected_value ?? 0), 0)
            return (
              <div
                key={stage}
                className="flex flex-col rounded-xl border border-line bg-surface-muted/60 p-3 min-h-[320px]"
              >
                <header className="mb-3 flex items-center justify-between gap-1">
                  <div>
                    <strong className="text-xs font-bold uppercase tracking-wider text-ink">
                      {stage.replace('_', ' ')}
                    </strong>
                    {stageTotal > 0 ? (
                      <span className="block text-[0.65rem] text-muted">{money(stageTotal)}</span>
                    ) : null}
                  </div>
                  <Badge variant={stage === 'won' ? 'success' : stage === 'lost' ? 'danger' : 'default'}>
                    {items.length}
                  </Badge>
                </header>

                <div className="flex flex-1 flex-col gap-2.5">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      onClick={() => edit(item)}
                      className="cursor-pointer rounded-lg border border-line bg-surface p-3 shadow-card transition-shadow hover:shadow-md"
                    >
                      <strong className="block text-sm font-semibold text-ink leading-tight">
                        {item.title}
                      </strong>
                      <span className="mt-1 block text-sm font-bold text-accent">
                        {money(item.expected_value)}
                      </span>
                      {item.next_action ? (
                        <p className="mt-1.5 text-xs text-muted">
                          Next: {item.next_action}
                        </p>
                      ) : null}
                      {item.expected_close_date ? (
                        <p className="mt-0.5 text-[0.65rem] text-muted/70">
                          Close: {shortDate(item.expected_close_date)}
                        </p>
                      ) : null}

                      <div className="mt-2.5 pt-2 border-t border-line/60">
                        <select
                          className="w-full rounded-md border border-line bg-surface-muted px-2 py-1 text-xs text-muted"
                          value={item.stage}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setMove({ item, stage: e.target.value as OpportunityStage })
                          }
                        >
                          {stages.map((value) => (
                            <option key={value} value={value}>
                              Move to: {value.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  ))}

                  {items.length === 0 ? (
                    <div className="grid flex-1 place-items-center py-8 text-center text-muted">
                      <BriefcaseBusiness size={20} className="mb-1 opacity-30" />
                      <span className="text-xs">No deals</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Drawer */}
      <Drawer
        title={selected ? 'Edit opportunity' : 'Add opportunity'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={save}>
          <InputField
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <SelectField
            label="Person"
            value={form.person_id}
            onChange={(e) => setForm({ ...form, person_id: e.target.value })}
            required
          >
            <option value="">Select a person</option>
            {people.map((person) => (
              <option value={person.id} key={person.id}>
                {person.first_name} {person.last_name}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Service interest"
            value={form.service_interest}
            onChange={(e) => setForm({ ...form, service_interest: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="Expected value (INR)"
              type="number"
              min="0"
              value={form.expected_value}
              onChange={(e) => setForm({ ...form, expected_value: e.target.value })}
            />
            <InputField
              label="Probability %"
              type="number"
              min="0"
              max="100"
              value={form.probability}
              onChange={(e) => setForm({ ...form, probability: e.target.value })}
            />
          </div>
          <InputField
            label="Expected close date"
            type="date"
            value={form.expected_close_date}
            onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
          />
          <InputField
            label="Next action"
            value={form.next_action}
            onChange={(e) => setForm({ ...form, next_action: e.target.value })}
          />
          <InputField
            label="Next action due"
            type="datetime-local"
            value={form.next_action_due_at}
            onChange={(e) => setForm({ ...form, next_action_due_at: e.target.value })}
          />
          <TextareaField
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button type="submit">Save opportunity</Button>
        </form>
      </Drawer>

      {/* Stage Change Modal */}
      <Modal
        title={`Move to ${move?.stage.replace('_', ' ') ?? ''}`}
        open={!!move}
        onClose={() => setMove(null)}
      >
        <div className="flex flex-col gap-4">
          {move && (move.stage === 'lost' || move.stage === 'on_hold') ? (
            <TextareaField
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          ) : null}
          <p className="text-sm text-muted">
            The stage change will be recorded in opportunity history.
          </p>
          <Button
            onClick={() => void change()}
            disabled={
              !!move && (move.stage === 'lost' || move.stage === 'on_hold') && !reason.trim()
            }
          >
            Confirm stage
          </Button>
        </div>
      </Modal>
    </div>
  )
}

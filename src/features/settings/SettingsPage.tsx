import { KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/Field'
import { Panel } from '@/components/ui/Panel'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { supabase } from '@/lib/supabase'

type Settings = {
  owner_id: string
  display_name: string
  timezone: string
  working_day_start: string
  working_day_end: string
  lunch_start: string
  lunch_end: string
  daily_conversation_limit: number
  conversation_minutes: number
  resend_daily_limit: number
  transactional_reserve: number
}
type Audit = {
  id: number
  action: string
  entity_type: string
  created_at: string
  metadata: Record<string, unknown>
}

export function SettingsPage() {
  const { factors, refreshSecurityState } = useAuth()
  const { data, refresh } = useRows<Settings>('owner_settings', 'created_at', false)
  const { data: audit } = useRows<Audit>('audit_events', 'created_at', false)
  const [form, setForm] = useState<Settings | null>(null)

  useEffect(() => {
    if (data[0] && !form) setForm(data[0])
  }, [data, form])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const { error } = await supabase
      .from('owner_settings')
      .update({
        display_name: form.display_name,
        working_day_start: form.working_day_start,
        working_day_end: form.working_day_end,
        lunch_start: form.lunch_start,
        lunch_end: form.lunch_end,
        daily_conversation_limit: form.daily_conversation_limit,
        conversation_minutes: form.conversation_minutes,
        resend_daily_limit: form.resend_daily_limit,
        transactional_reserve: form.transactional_reserve,
      })
      .eq('owner_id', form.owner_id)
    if (error) alert(error.message)
    else await refresh()
  }

  const removeFactor = async (id: string) => {
    if (factors.length <= 2) {
      return alert('Keep both enrolled authenticators. Add a replacement before removing one.')
    }
    if (!confirm('Remove this authenticator?')) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) alert(error.message)
    else await refreshSecurityState()
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-6">
      <PageHeader
        eyebrow="Private workspace"
        title="Settings"
        description="Owner identity, exact operating limits, authentication, and audit history."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Operating rules">
          {form && (
            <form className="flex flex-col gap-4" onSubmit={save}>
              <InputField
                label="Display name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InputField
                  label="Work starts"
                  type="time"
                  value={form.working_day_start.slice(0, 5)}
                  onChange={(e) => setForm({ ...form, working_day_start: e.target.value })}
                />
                <InputField
                  label="Work ends"
                  type="time"
                  value={form.working_day_end.slice(0, 5)}
                  onChange={(e) => setForm({ ...form, working_day_end: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InputField
                  label="Lunch starts"
                  type="time"
                  value={form.lunch_start.slice(0, 5)}
                  onChange={(e) => setForm({ ...form, lunch_start: e.target.value })}
                />
                <InputField
                  label="Lunch ends"
                  type="time"
                  value={form.lunch_end.slice(0, 5)}
                  onChange={(e) => setForm({ ...form, lunch_end: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InputField
                  label="Daily conversations"
                  type="number"
                  min="1"
                  max="12"
                  value={form.daily_conversation_limit}
                  onChange={(e) =>
                    setForm({ ...form, daily_conversation_limit: Number(e.target.value) })
                  }
                />
                <InputField
                  label="Minutes per slot"
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={form.conversation_minutes}
                  onChange={(e) =>
                    setForm({ ...form, conversation_minutes: Number(e.target.value) })
                  }
                />
              </div>
              <Button type="submit">Save operating rules</Button>
            </form>
          )}
        </Panel>

        <Panel title="Authenticator security">
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-line bg-accent-soft p-3 text-xs text-accent-strong">
            <ShieldCheck size={16} className="shrink-0" />
            <span>Every data request also requires an AAL2 authenticator session.</span>
          </div>
          <div className="flex flex-col divide-y divide-line">
            {factors.map((factor, index) => (
              <div className="flex items-center gap-3 py-3 text-sm" key={factor.id}>
                <KeyRound size={18} className="text-muted" />
                <div className="flex-1">
                  <strong className="block font-semibold">Authenticator {index + 1}</strong>
                  <small className="text-xs text-muted">
                    {factor.status} · added{' '}
                    {factor.created_at
                      ? new Date(factor.created_at).toLocaleDateString('en-IN')
                      : 'recently'}
                  </small>
                </div>
                <Badge variant="success">TOTP</Badge>
                <Button variant="ghost" size="sm" onClick={() => void removeFactor(factor.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent audit events">
        <div className="flex flex-col divide-y divide-line max-h-96 overflow-y-auto">
          {audit.slice(0, 30).map((item) => (
            <div className="flex items-center justify-between py-2.5 text-sm" key={item.id}>
              <div>
                <strong className="font-semibold text-ink">{item.action}</strong>
                <small className="block text-xs text-muted">{item.entity_type}</small>
              </div>
              <span className="text-xs text-muted">
                {new Date(item.created_at).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
          {!audit.length && (
            <p className="py-8 text-center text-sm text-muted">
              Audit events will appear as protected actions occur.
            </p>
          )}
        </div>
      </Panel>
    </div>
  )
}

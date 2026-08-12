import { useState } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Mail,
  Phone,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Overlay'
import { money, shortDate } from '@/lib/data'
import type { Opportunity, Person, Task } from '@/types/domain'

type Props = {
  person: Person | null
  open: boolean
  onClose: () => void
  onEdit: (person: Person) => void
  onTrash: (person: Person) => void
  opportunities?: Opportunity[]
  tasks?: Task[]
}

export function PersonDetailDrawer({
  person,
  open,
  onClose,
  onEdit,
  onTrash,
  opportunities = [],
  tasks = [],
}: Props) {
  const [tab, setTab] = useState<'overview' | 'deals' | 'activity' | 'notes'>('overview')

  if (!person) return null

  const personOpps = opportunities.filter((o) => o.person_id === person.id)
  const totalValue = personOpps.reduce((sum, o) => sum + (o.expected_value ?? 0), 0)
  const wonOpps = personOpps.filter((o) => o.stage === 'won')
  const personTasks = tasks.filter((t) => t.status !== 'done')

  const statusVariant =
    person.relationship_status === 'active_client'
      ? 'success'
      : person.relationship_status === 'prospect'
        ? 'warning'
        : 'default'

  return (
    <Drawer title="Customer Profile" open={open} onClose={onClose}>
      <div className="flex flex-col gap-6">
        {/* Profile Card Header (PaceUI style) */}
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 rounded-xl border border-line bg-surface-muted/50 p-4">
          <Avatar
            name={`${person.first_name} ${person.last_name ?? ''}`}
            size="lg"
            status={person.relationship_status === 'active_client' ? 'online' : 'offline'}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <h2 className="text-lg font-bold text-ink">
                {person.first_name} {person.last_name}
              </h2>
              <Badge variant={statusVariant}>
                {person.relationship_status.replace('_', ' ')}
              </Badge>
            </div>
            {person.email ? (
              <a
                href={`mailto:${person.email}`}
                className="mt-1 flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors justify-center sm:justify-start"
              >
                <Mail size={13} />
                <span>{person.email}</span>
              </a>
            ) : null}
            {person.phone ? (
              <a
                href={`tel:${person.phone}`}
                className="mt-0.5 flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors justify-center sm:justify-start"
              >
                <Phone size={13} />
                <span>{person.phone}</span>
              </a>
            ) : null}
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              onClick={() => {
                onClose()
                onEdit(person)
              }}
              title="Edit Profile"
            >
              <Edit2 size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={() => {
                onClose()
                onTrash(person)
              }}
              title="Move to Trash"
            >
              <Trash2 size={14} className="text-danger" />
            </Button>
          </div>
        </div>

        {/* Mini KPI Metrics Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-line bg-surface p-3 text-center">
            <span className="block text-[0.65rem] font-bold uppercase text-muted">Pipeline</span>
            <strong className="text-sm font-extrabold text-ink">{money(totalValue)}</strong>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3 text-center">
            <span className="block text-[0.65rem] font-bold uppercase text-muted">Won Deals</span>
            <strong className="text-sm font-extrabold text-accent">{wonOpps.length}</strong>
          </div>
          <div className="rounded-lg border border-line bg-surface p-3 text-center">
            <span className="block text-[0.65rem] font-bold uppercase text-muted">Open Tasks</span>
            <strong className="text-sm font-extrabold text-ink">{personTasks.length}</strong>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line gap-1">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'deals', label: `Deals (${personOpps.length})` },
              { id: 'activity', label: 'Activity' },
              { id: 'notes', label: 'Notes' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                tab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'overview' ? (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Contact Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted block">First Name</span>
                  <strong className="font-semibold text-ink">{person.first_name}</strong>
                </div>
                <div>
                  <span className="text-muted block">Last Name</span>
                  <strong className="font-semibold text-ink">{person.last_name || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted block">Source</span>
                  <Badge variant="outline">{person.source}</Badge>
                </div>
                <div>
                  <span className="text-muted block">Status</span>
                  <Badge variant={statusVariant}>{person.relationship_status.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>

            {person.notes ? (
              <div className="rounded-xl border border-line bg-surface p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Notes</h3>
                <p className="text-muted leading-relaxed whitespace-pre-wrap">{person.notes}</p>
              </div>
            ) : null}
          </div>
        ) : tab === 'deals' ? (
          <div className="space-y-2">
            {personOpps.length > 0 ? (
              personOpps.map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface text-xs"
                >
                  <div>
                    <strong className="font-semibold text-ink block">{opp.title}</strong>
                    <span className="text-muted">{opp.stage.replace('_', ' ')}</span>
                  </div>
                  <strong className="text-accent font-bold">{money(opp.expected_value)}</strong>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted text-xs">No deals associated with this person.</div>
            )}
          </div>
        ) : tab === 'activity' ? (
          <div className="space-y-3 text-xs">
            <div className="relative pl-4 border-l border-line space-y-4">
              <div className="relative">
                <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-accent ring-4 ring-surface" />
                <strong className="block text-ink font-semibold">Record created</strong>
                <span className="text-muted text-[0.68rem]">Source: {person.source}</span>
              </div>
              {personOpps.map((o) => (
                <div key={o.id} className="relative">
                  <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-blue-500 ring-4 ring-surface" />
                  <strong className="block text-ink font-semibold">Opportunity: {o.title}</strong>
                  <span className="text-muted text-[0.68rem]">{money(o.expected_value)} · {o.stage}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface p-4 text-xs">
            <p className="text-muted whitespace-pre-wrap">{person.notes || 'No notes recorded for this contact.'}</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}

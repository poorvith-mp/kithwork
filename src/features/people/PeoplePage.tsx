import { Eye, Filter, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable, type RowAction } from '@/components/ui/DataTable'
import { InputField, SelectField, TextareaField } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { insertRow, trashRow, updateRow } from '@/lib/data'
import type { Opportunity, Person, Task } from '@/types/domain'

import { PersonDetailDrawer } from './PersonDetailDrawer'

const empty = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  relationship_status: 'lead',
  notes: '',
}

export function PeoplePage() {
  const { user } = useAuth()
  const { data, loading, error, refresh } = useRows<Person>('people')
  const { data: opportunities } = useRows<Opportunity>('opportunities')
  const { data: tasks } = useRows<Task>('tasks')

  const [viewingPerson, setViewingPerson] = useState<Person | null>(null)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [saveError, setSaveError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return data
    return data.filter((p) => p.relationship_status === statusFilter)
  }, [data, statusFilter])

  const openCreate = () => {
    setEditingPerson(null)
    setForm(empty)
    setCreating(true)
  }

  const openEdit = (person: Person) => {
    setEditingPerson(person)
    setForm({
      first_name: person.first_name,
      last_name: person.last_name ?? '',
      email: person.email ?? '',
      phone: person.phone ?? '',
      relationship_status: person.relationship_status,
      notes: person.notes ?? '',
    })
    setCreating(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaveError('')
    try {
      if (editingPerson) await updateRow('people', editingPerson.id, form)
      else await insertRow('people', { ...form, owner_id: user!.id, source: 'manual' })
      setCreating(false)
      await refresh()
    } catch (value) {
      setSaveError(value instanceof Error ? value.message : 'Unable to save person')
    }
  }

  const remove = async (person: Person) => {
    if (!confirm(`Move ${person.first_name} to Trash?`)) return
    await trashRow('people', person.id)
    await refresh()
  }

  const bulkDelete = async (selectedPersons: Person[]) => {
    if (!confirm(`Move ${selectedPersons.length} selected records to Trash?`)) return
    for (const p of selectedPersons) {
      await trashRow('people', p.id)
    }
    await refresh()
  }

  const columns: Column<Person>[] = [
    {
      key: 'name',
      label: 'Customer / Person',
      sortable: true,
      render: (person) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={`${person.first_name} ${person.last_name ?? ''}`}
            size="sm"
            status={person.relationship_status === 'active_client' ? 'online' : undefined}
          />
          <div className="min-w-0">
            <strong className="block font-semibold text-ink truncate">
              {person.first_name} {person.last_name}
            </strong>
            <small className="block text-xs text-muted truncate">{person.email || 'No email'}</small>
          </div>
        </div>
      ),
    },
    {
      key: 'relationship_status',
      label: 'Status',
      sortable: true,
      render: (person) => {
        const variant =
          person.relationship_status === 'active_client'
            ? 'success'
            : person.relationship_status === 'lead'
              ? 'warning'
              : 'default'
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
            <Badge dot variant={variant} />
            <span className="capitalize">{person.relationship_status.replace('_', ' ')}</span>
          </span>
        )
      },
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (person) => <span className="text-muted text-xs">{person.phone || '—'}</span>,
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (person) => <Badge variant="outline">{person.source}</Badge>,
    },
  ]

  const rowActions: RowAction<Person>[] = [
    {
      label: 'View details',
      icon: <Eye size={13} />,
      onClick: (person) => setViewingPerson(person),
    },
    {
      label: 'Edit',
      onClick: (person) => openEdit(person),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={13} />,
      danger: true,
      onClick: (person) => void remove(person),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-4">
      <PageHeader
        eyebrow="Clients & Relationships"
        title="People"
        description="Every individual relationship, client account, and communication point."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} />
            <span>Add person</span>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          keyField="id"
          searchPlaceholder="Search customers by name or email..."
          searchFields={['first_name', 'last_name', 'email', 'phone']}
          selectable
          rowActions={rowActions}
          onRowClick={(person) => setViewingPerson(person)}
          onBulkDelete={bulkDelete}
          filters={
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-muted" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
              >
                <option value="all">All statuses</option>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="active_client">Active client</option>
                <option value="past_client">Past client</option>
              </select>
            </div>
          }
          emptyTitle="No people found"
          emptyDescription="Add a person manually or receive a verified public enquiry."
        />
      )}

      {/* Tabbed Detail Drawer */}
      <PersonDetailDrawer
        person={viewingPerson}
        open={Boolean(viewingPerson)}
        onClose={() => setViewingPerson(null)}
        onEdit={openEdit}
        onTrash={remove}
        opportunities={opportunities}
        tasks={tasks}
      />

      {/* Edit / Create Drawer */}
      <Drawer
        title={editingPerson ? 'Edit person' : 'Add person'}
        open={creating}
        onClose={() => setCreating(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={save}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="First name"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              required
            />
            <InputField
              label="Last name"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
          <InputField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <InputField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <SelectField
            label="Relationship status"
            value={form.relationship_status}
            onChange={(e) => setForm({ ...form, relationship_status: e.target.value })}
          >
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="active_client">Active client</option>
            <option value="past_client">Past client</option>
          </SelectField>
          <TextareaField
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {saveError ? (
            <div className="rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger">
              {saveError}
            </div>
          ) : null}
          <Button type="submit">{editingPerson ? 'Save changes' : 'Create person'}</Button>
        </form>
      </Drawer>
    </div>
  )
}

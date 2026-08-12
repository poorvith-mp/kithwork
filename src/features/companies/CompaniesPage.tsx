import { Building2, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { InputField, SelectField, TextareaField } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useAuth } from '@/features/auth/AuthProvider'
import { useRows } from '@/hooks/useRows'
import { insertRow, trashRow, updateRow } from '@/lib/data'
import type { Company } from '@/types/domain'

const empty = {
  name: '',
  website: '',
  email: '',
  phone: '',
  industry: '',
  status: 'prospect',
  notes: '',
}

export function CompaniesPage() {
  const { user } = useAuth()
  const { data, loading, error, refresh } = useRows<Company>('companies')
  const [selected, setSelected] = useState<Company | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [saveError, setSaveError] = useState('')

  const edit = (company?: Company) => {
    setSelected(company ?? null)
    setForm(
      company
        ? {
            name: company.name,
            website: company.website ?? '',
            email: company.email ?? '',
            phone: company.phone ?? '',
            industry: company.industry ?? '',
            status: company.status,
            notes: company.notes ?? '',
          }
        : empty,
    )
    setOpen(true)
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaveError('')
    try {
      if (selected) await updateRow('companies', selected.id, form)
      else await insertRow('companies', { ...form, owner_id: user!.id })
      setOpen(false)
      await refresh()
    } catch (value) {
      setSaveError(value instanceof Error ? value.message : 'Unable to save company')
    }
  }

  const remove = async (company: Company) => {
    if (!confirm(`Move ${company.name} to Trash?`)) return
    await trashRow('companies', company.id)
    await refresh()
  }

  const columns: Column<Company>[] = [
    {
      key: 'name',
      label: 'Company',
      sortable: true,
      render: (company) => (
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent-strong font-bold text-xs">
            <Building2 size={16} />
          </span>
          <div>
            <strong className="font-semibold text-ink">{company.name}</strong>
            {company.industry ? (
              <small className="block text-xs text-muted">{company.industry}</small>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (company) => {
        const variant =
          company.status === 'active_client'
            ? 'success'
            : company.status === 'lead'
              ? 'warning'
              : 'default'
        return <Badge variant={variant}>{company.status.replace('_', ' ')}</Badge>
      },
    },
    {
      key: 'email',
      label: 'Email',
      render: (company) => <span className="text-muted">{company.email || '—'}</span>,
    },
    {
      key: 'website',
      label: 'Website',
      render: (company) =>
        company.website ? (
          <a
            href={company.website}
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {company.website.replace(/^https?:\/\//, '')}
          </a>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (company) => <span className="text-muted">{company.phone || '—'}</span>,
    },
    {
      key: 'actions',
      label: '',
      className: 'w-10 text-right',
      render: (company) => (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label="Move to Trash"
          onClick={(e) => {
            e.stopPropagation()
            void remove(company)
          }}
        >
          <Trash2 size={15} />
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Clients"
        title="Companies"
        description="Optional business accounts connected to one or more people."
        actions={
          <Button onClick={() => edit()}>
            <Plus size={16} />
            <span>Add company</span>
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          searchPlaceholder="Search companies by name, industry..."
          searchFields={['name', 'industry', 'email', 'website']}
          onRowClick={edit}
          emptyTitle="No companies yet"
          emptyDescription="Keep independent clients as people, and add companies only when useful."
        />
      )}

      <Drawer
        title={selected ? 'Edit company' : 'Add company'}
        open={open}
        onClose={() => setOpen(false)}
      >
        <form className="flex flex-col gap-4" onSubmit={save}>
          <InputField
            label="Company name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InputField
              label="Website"
              type="url"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
            <InputField
              label="Industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
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
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
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
          <Button type="submit">Save company</Button>
        </form>
      </Drawer>
    </div>
  )
}

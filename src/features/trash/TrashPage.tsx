import { ArchiveRestore, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { Panel } from '@/components/ui/Panel'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { supabase } from '@/lib/supabase'

type Trashed = {
  id: string
  label: string
  table: string
  deleted_at: string
  purge_after: string
}

const tables = [
  ['people', 'first_name'],
  ['companies', 'name'],
  ['enquiries', 'subject'],
  ['opportunities', 'title'],
  ['projects', 'title'],
  ['tasks', 'title'],
  ['conversations', 'subject'],
  ['files', 'original_name'],
] as const

export function TrashPage() {
  const [data, setData] = useState<Trashed[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const groups = await Promise.all(
      tables.map(async ([table, label]) => {
        const { data: rows } = await supabase
          .from(table)
          .select(`id,${label},deleted_at,purge_after`)
          .not('deleted_at', 'is', null)
        return (rows ?? []).map((row) => ({
          id: String(row.id),
          label: String(Reflect.get(row, label) ?? 'Untitled'),
          table,
          deleted_at: String(row.deleted_at),
          purge_after: String(row.purge_after),
        }))
      }),
    )
    setData(groups.flat().sort((a, b) => b.deleted_at.localeCompare(a.deleted_at)))
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const restore = async (item: Trashed) => {
    const { error } = await supabase
      .from(item.table)
      .update({ deleted_at: null, purge_after: null })
      .eq('id', item.id)
    if (error) alert(error.message)
    else await load()
  }

  const columns: Column<Trashed>[] = [
    {
      key: 'label',
      label: 'Record',
      sortable: true,
      render: (item) => <strong className="font-semibold text-ink">{item.label}</strong>,
    },
    {
      key: 'table',
      label: 'Module',
      sortable: true,
      render: (item) => <Badge variant="outline">{item.table}</Badge>,
    },
    {
      key: 'deleted_at',
      label: 'Deleted',
      sortable: true,
      render: (item) => (
        <span className="text-muted text-xs">
          {new Date(item.deleted_at).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      key: 'purge_after',
      label: 'Purges',
      sortable: true,
      render: (item) => (
        <span className="text-muted text-xs">
          {new Date(item.purge_after).toLocaleDateString('en-IN')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'w-24 text-right',
      render: (item) => (
        <Button variant="secondary" size="sm" onClick={() => void restore(item)}>
          <ArchiveRestore size={14} />
          <span>Restore</span>
        </Button>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="30-day recovery"
        title="Trash"
        description="Soft-deleted records are recoverable here and are automatically purged after 30 days."
      />

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyField="id"
          searchPlaceholder="Search deleted records..."
          searchFields={['label', 'table']}
          emptyTitle="Trash is empty"
          emptyDescription="Deleted records will remain here for 30 days."
        />
      )}
    </div>
  )
}

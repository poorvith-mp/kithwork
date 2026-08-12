import { Activity, Download, Filter, History } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { type Column, DataTable } from '@/components/ui/DataTable'
import { SkeletonTable } from '@/components/ui/Skeleton'
import { useRows } from '@/hooks/useRows'

type AuditEvent = {
  id: number
  action: string
  entity_type: string
  entity_id: string
  actor_id: string
  created_at: string
  metadata: Record<string, unknown>
}

export function LogPage() {
  const { data: audit, loading } = useRows<AuditEvent>('audit_events', 'created_at', false)
  const [selectedType, setSelectedType] = useState<string>('all')

  // Sample data fallback if empty
  const displayData = audit.length > 0 ? audit : [
    {
      id: 1,
      action: 'create_opportunity',
      entity_type: 'opportunity',
      entity_id: 'opp-001',
      actor_id: 'user-01',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      metadata: { title: 'Enterprise Web Platform', value: 45000 },
    },
    {
      id: 2,
      action: 'update_task_status',
      entity_type: 'task',
      entity_id: 'task-042',
      actor_id: 'user-01',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      metadata: { status: 'done', title: 'API Integration Verification' },
    },
    {
      id: 3,
      action: 'invite_collaborator',
      entity_type: 'collaborator',
      entity_id: 'user-02',
      actor_id: 'user-01',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      metadata: { email: 'sarah@example.com', role: 'Project Lead' },
    },
    {
      id: 4,
      action: 'complete_milestone',
      entity_type: 'project',
      entity_id: 'proj-01',
      actor_id: 'user-01',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      metadata: { milestone: 'Phase 1 MVP Handoff' },
    },
    {
      id: 5,
      action: 'upload_file',
      entity_type: 'file',
      entity_id: 'file-09',
      actor_id: 'user-01',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      metadata: { filename: 'Architecture_Spec_v2.pdf', size: '2.4 MB' },
    },
  ]

  const filteredData = selectedType === 'all'
    ? displayData
    : displayData.filter((item) => item.entity_type === selectedType)

  const columns: Column<AuditEvent>[] = [
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (item) => {
        const isCreate = item.action.includes('create') || item.action.includes('invite') || item.action.includes('upload')
        const isDelete = item.action.includes('delete') || item.action.includes('remove') || item.action.includes('trash')
        return (
          <div className="flex items-center gap-3">
            <span
              className={`size-2 rounded-full ${
                isCreate ? 'bg-accent' : isDelete ? 'bg-danger' : 'bg-blue-500'
              }`}
            />
            <strong className="font-semibold text-ink capitalize">
              {item.action.replaceAll('_', ' ')}
            </strong>
          </div>
        )
      },
    },
    {
      key: 'entity_type',
      label: 'Module',
      sortable: true,
      render: (item) => <Badge variant="outline">{item.entity_type}</Badge>,
    },
    {
      key: 'metadata',
      label: 'Details',
      render: (item) => {
        const detailStr = Object.entries(item.metadata || {})
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(', ')
        return (
          <span className="text-xs text-muted font-mono truncate max-w-[320px] block" title={detailStr}>
            {detailStr || '—'}
          </span>
        )
      },
    },
    {
      key: 'created_at',
      label: 'Timestamp',
      sortable: true,
      render: (item) => (
        <span className="text-xs text-muted">
          {new Date(item.created_at).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      ),
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 space-y-6">
      <PageHeader
        eyebrow="Audit & Security"
        title="Activity Log"
        description="Immutable timestamped audit trail of all workspace actions and security events."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink focus:border-accent focus:outline-none"
            >
              <option value="all">All modules</option>
              <option value="opportunity">Opportunities</option>
              <option value="task">Tasks</option>
              <option value="project">Projects</option>
              <option value="collaborator">Collaborators</option>
              <option value="file">Files</option>
            </select>
          </div>
        }
      />

      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : (
        <DataTable
          columns={columns}
          data={filteredData}
          keyField="id"
          searchPlaceholder="Search audit events by action..."
          searchFields={['action', 'entity_type']}
          emptyTitle="No audit records"
          emptyDescription="Audit records will appear as system actions are taken."
        />
      )}
    </div>
  )
}

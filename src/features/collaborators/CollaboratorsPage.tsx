import { History, UserPlus, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/components/ui/Panel'
import { Skeleton } from '@/components/ui/Skeleton'

import { loadCollaboratorWorkspace } from './collaboratorData'
import { InviteCollaboratorDialog } from './InviteCollaboratorDialog'
import { ManageCollaboratorDrawer } from './ManageCollaboratorDrawer'
import type {
  AssignmentCandidate,
  CollaboratorAudit,
  CollaboratorRecord,
} from './types'

const stateVariant = {
  invited: 'warning',
  active: 'success',
  suspended: 'warning',
  revoked: 'danger',
} as const

export function CollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<CollaboratorRecord[]>([])
  const [candidates, setCandidates] = useState<AssignmentCandidate[]>([])
  const [audit, setAudit] = useState<CollaboratorAudit[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const workspace = await loadCollaboratorWorkspace()
      setCollaborators(workspace.collaborators)
      setCandidates(workspace.candidates)
      setAudit(workspace.audit)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to load collaborators.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selected = useMemo(
    () => collaborators.find((item) => item.profile.user_id === selectedId) ?? null,
    [collaborators, selectedId],
  )
  const nameById = useMemo(
    () => new Map(collaborators.map((item) => [item.profile.user_id, item.profile.full_name])),
    [collaborators],
  )

  return (
    <div className="mx-auto w-full max-w-[1680px] p-4 sm:p-6">
      <PageHeader
        eyebrow="Owner workspace"
        title="Collaborators"
        description="Invite people and assign exact module and record access."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} />
            <span>Invite collaborator</span>
          </Button>
        }
      />

      {error ? (
        <div
          className="mb-4 rounded-lg border border-[#ffd5d0] bg-danger-soft p-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Individual access">
          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : collaborators.length > 0 ? (
            <div className="flex flex-col divide-y divide-line">
              {collaborators.map((collaborator) => {
                const moduleCount = Object.keys(collaborator.permissions).length
                return (
                  <button
                    className="flex items-center gap-3.5 py-3.5 px-1 text-left transition-colors hover:bg-surface-muted/60 rounded-lg cursor-pointer"
                    type="button"
                    key={collaborator.profile.user_id}
                    onClick={() => setSelectedId(collaborator.profile.user_id)}
                  >
                    <Avatar name={collaborator.profile.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <strong className="block font-semibold text-ink text-sm">
                        {collaborator.profile.full_name}
                      </strong>
                      <small className="block text-xs text-muted truncate">
                        {collaborator.profile.email} ·{' '}
                        {collaborator.profile.role_title ?? 'Collaborator'}
                      </small>
                      <span className="block text-[0.7rem] text-muted/80 mt-0.5">
                        {moduleCount} {moduleCount === 1 ? 'module' : 'modules'} ·{' '}
                        {collaborator.assignments.length} assigned{' '}
                        {collaborator.assignments.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>
                    <Badge variant={stateVariant[collaborator.profile.account_state]}>
                      {collaborator.profile.account_state}
                    </Badge>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center text-muted">
              <Users size={38} className="mb-2 opacity-40 text-accent" />
              <h2 className="text-base font-bold text-ink">No collaborators yet</h2>
              <p className="text-sm">
                Invite someone when you are ready to assign individual workspace records.
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Recent access activity">
          {loading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : audit.length > 0 ? (
            <div className="flex flex-col divide-y divide-line">
              {audit.map((event) => (
                <div className="flex items-start gap-3 py-3 text-sm" key={event.id}>
                  <History size={16} className="text-muted mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-semibold capitalize text-ink">
                      {event.action.replaceAll('_', ' ')}
                    </strong>
                    <small className="text-xs text-muted">
                      {nameById.get(event.entity_id) ?? 'Preserved collaborator'} ·{' '}
                      {new Date(event.created_at).toLocaleString()}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8 text-center text-muted">
              <History size={24} className="mb-2 opacity-40" />
              <p className="text-sm">No collaborator access changes yet.</p>
            </div>
          )}
        </Panel>
      </div>

      <InviteCollaboratorDialog
        open={inviteOpen}
        candidates={candidates}
        onClose={() => setInviteOpen(false)}
        onComplete={refresh}
      />
      <ManageCollaboratorDrawer
        collaborator={selected}
        candidates={candidates}
        onClose={() => setSelectedId(null)}
        onComplete={refresh}
      />
    </div>
  )
}

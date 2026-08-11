import { useCallback, useEffect, useMemo, useState } from 'react'
import { History, UserPlus, Users } from 'lucide-react'

import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge, Panel } from '@/components/ui/Panel'

import { loadCollaboratorWorkspace } from './collaboratorData'
import { InviteCollaboratorDialog } from './InviteCollaboratorDialog'
import { ManageCollaboratorDrawer } from './ManageCollaboratorDrawer'
import type {
  AssignmentCandidate,
  CollaboratorAudit,
  CollaboratorRecord,
} from './types'

const stateTone = {
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

  useEffect(() => { void refresh() }, [refresh])
  const selected = useMemo(
    () => collaborators.find((item) => item.profile.user_id === selectedId) ?? null,
    [collaborators, selectedId],
  )
  const nameById = useMemo(
    () => new Map(collaborators.map((item) => [item.profile.user_id, item.profile.full_name])),
    [collaborators],
  )

  return (
    <main className="page">
      <PageHeader
        eyebrow="Owner workspace"
        title="Collaborators"
        description="Invite people and assign exact module and record access."
        actions={<Button onClick={() => setInviteOpen(true)}><UserPlus size={16}/>Invite collaborator</Button>}
      />
      {error ? <div className="error-box" role="alert">{error}</div> : null}
      <div className="collaborator-layout">
        <Panel title="Individual access">
          {loading ? <div className="empty"><div className="spinner" aria-label="Loading collaborators"/></div> : collaborators.length > 0 ? (
            <div className="collaborator-list">
              {collaborators.map((collaborator) => {
                const moduleCount = Object.keys(collaborator.permissions).length
                return (
                  <button className="collaborator-row" type="button" key={collaborator.profile.user_id} onClick={() => setSelectedId(collaborator.profile.user_id)}>
                    <span className="collaborator-avatar">{collaborator.profile.full_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
                    <span className="grow collaborator-copy"><strong>{collaborator.profile.full_name}</strong><small>{collaborator.profile.email} · {collaborator.profile.role_title ?? 'Collaborator'}</small><span>{moduleCount} {moduleCount === 1 ? 'module' : 'modules'} · {collaborator.assignments.length} assigned {collaborator.assignments.length === 1 ? 'record' : 'records'}</span></span>
                    <Badge tone={stateTone[collaborator.profile.account_state]}>{collaborator.profile.account_state}</Badge>
                  </button>
                )
              })}
            </div>
          ) : <div className="empty"><Users size={38}/><h2>No collaborators yet</h2><p>Invite someone when you are ready to assign individual workspace records.</p></div>}
        </Panel>

        <Panel title="Recent access activity">
          {loading ? <div className="empty"><div className="spinner"/></div> : audit.length > 0 ? (
            <div className="audit-list">
              {audit.map((event) => (
                <div className="audit-row" key={event.id}>
                  <History size={17}/><span><strong>{event.action.replaceAll('_', ' ')}</strong><small>{nameById.get(event.entity_id) ?? 'Preserved collaborator'} · {new Date(event.created_at).toLocaleString()}</small></span>
                </div>
              ))}
            </div>
          ) : <div className="empty compact"><History size={30}/><p>No collaborator access changes yet.</p></div>}
        </Panel>
      </div>
      <InviteCollaboratorDialog open={inviteOpen} candidates={candidates} onClose={() => setInviteOpen(false)} onComplete={refresh}/>
      <ManageCollaboratorDrawer collaborator={selected} candidates={candidates} onClose={() => setSelectedId(null)} onComplete={refresh}/>
    </main>
  )
}

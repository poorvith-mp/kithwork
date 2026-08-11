import { useEffect, useState } from 'react'
import { Ban, CheckCircle2, ShieldX } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Overlay'
import { Badge } from '@/components/ui/Panel'
import {
  setCollaboratorState,
  updateCollaboratorAccess,
  type AssignmentInput,
} from '@/lib/accountApi'

import { AccessImpactSummary, permissionChanges } from './AccessImpactSummary'
import { AssignmentEditor } from './AssignmentEditor'
import { PermissionEditor } from './PermissionEditor'
import type {
  AssignmentCandidate,
  CollaboratorRecord,
  PermissionDraft,
  StateAction,
} from './types'

const stateTone = {
  invited: 'warning',
  active: 'success',
  suspended: 'warning',
  revoked: 'danger',
} as const

function assignmentInputs(collaborator: CollaboratorRecord): AssignmentInput[] {
  return collaborator.assignments.map((assignment) => ({
    entityType: assignment.entity_type,
    entityId: assignment.entity_id,
  }))
}

type Props = {
  collaborator: CollaboratorRecord | null
  candidates: AssignmentCandidate[]
  onClose: () => void
  onComplete: () => Promise<void>
}

export function ManageCollaboratorDrawer({
  collaborator,
  candidates,
  onClose,
  onComplete,
}: Props) {
  const [permissions, setPermissions] = useState<PermissionDraft>({})
  const [assignments, setAssignments] = useState<AssignmentInput[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!collaborator) return
    setPermissions(collaborator.permissions)
    setAssignments(assignmentInputs(collaborator))
    setError('')
    setNotice('')
  }, [collaborator])

  if (!collaborator) return null

  const baselineAssignments = assignmentInputs(collaborator)
  const permissionChanged = permissionChanges(collaborator.permissions, permissions).length > 0
  const assignmentsChanged = JSON.stringify(
    [...baselineAssignments].sort((a, b) => `${a.entityType}:${a.entityId}`.localeCompare(`${b.entityType}:${b.entityId}`)),
  ) !== JSON.stringify(
    [...assignments].sort((a, b) => `${a.entityType}:${a.entityId}`.localeCompare(`${b.entityType}:${b.entityId}`)),
  )

  const save = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await updateCollaboratorAccess({
        userId: collaborator.profile.user_id,
        permissions,
        assignments,
      })
      await onComplete()
      setNotice('Collaborator access updated.')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to update collaborator access.')
    } finally {
      setBusy(false)
    }
  }

  const changeState = async (state: StateAction) => {
    const name = collaborator.profile.full_name
    const messages: Record<StateAction, string> = {
      active: `Reactivate ${name}? Their saved module permissions will return, but records must be assigned again.`,
      suspended: `Suspend ${name}? Their sessions will end and current record assignments will be removed. Activity history and module permissions remain.`,
      revoked: `Revoke ${name}? Access and active sessions will be removed. Their activity history will be preserved permanently.`,
    }
    if (!window.confirm(messages[state])) return

    setBusy(true)
    setError('')
    setNotice('')
    try {
      await setCollaboratorState({ userId: collaborator.profile.user_id, state })
      await onComplete()
      setNotice(`Collaborator ${state === 'active' ? 'reactivated' : state}.`)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to change collaborator state.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer title={`Manage ${collaborator.profile.full_name}`} open onClose={onClose}>
      <div className="stack collaborator-form">
        <div className="collaborator-summary">
          <div><strong>{collaborator.profile.email}</strong><small>{collaborator.profile.role_title ?? 'Collaborator'}</small></div>
          <Badge tone={stateTone[collaborator.profile.account_state]}>{collaborator.profile.account_state}</Badge>
        </div>
        <section className="editor-section"><h3>Module permissions</h3><p className="muted">Permissions never bypass record assignment. Permanent deletion and owner-only areas are unavailable.</p><PermissionEditor baseline={collaborator.permissions} value={permissions} onChange={setPermissions}/></section>
        <section className="editor-section"><h3>Record assignments</h3><AssignmentEditor candidates={candidates} selected={assignments} onChange={setAssignments}/></section>
        <AccessImpactSummary baseline={collaborator.permissions} value={permissions} assignmentDelta={assignments.length - baselineAssignments.length}/>
        {error ? <div className="error-box" role="alert">{error}</div> : null}
        {notice ? <div className="notice-box" role="status">{notice}</div> : null}
        <Button type="button" onClick={() => void save()} disabled={busy || (!permissionChanged && !assignmentsChanged)}>{busy ? 'Saving…' : 'Confirm access change'}</Button>
        <section className="account-state-section">
          <h3>Account state</h3>
          <p className="muted">State changes end sessions when access is removed. Activity history is never deleted.</p>
          <div className="form-actions">
            {collaborator.profile.account_state === 'active' ? <Button type="button" variant="secondary" onClick={() => void changeState('suspended')} disabled={busy}><Ban size={16}/>Suspend</Button> : <Button type="button" variant="secondary" onClick={() => void changeState('active')} disabled={busy}><CheckCircle2 size={16}/>Reactivate</Button>}
            {collaborator.profile.account_state !== 'revoked' ? <Button type="button" variant="danger" onClick={() => void changeState('revoked')} disabled={busy}><ShieldX size={16}/>Revoke access</Button> : null}
          </div>
        </section>
      </div>
    </Drawer>
  )
}

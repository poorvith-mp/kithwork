import { useState, type FormEvent } from 'react'
import { MailPlus } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/Field'
import { Drawer } from '@/components/ui/Overlay'
import { inviteCollaborator, type AssignmentInput } from '@/lib/accountApi'

import { AssignmentEditor } from './AssignmentEditor'
import { PermissionEditor } from './PermissionEditor'
import type { AssignmentCandidate, PermissionDraft } from './types'

type Props = {
  open: boolean
  candidates: AssignmentCandidate[]
  onClose: () => void
  onComplete: () => Promise<void>
}

export function InviteCollaboratorDialog({
  open,
  candidates,
  onClose,
  onComplete,
}: Props) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [permissions, setPermissions] = useState<PermissionDraft>({})
  const [assignments, setAssignments] = useState<AssignmentInput[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setEmail('')
    setFullName('')
    setRoleTitle('')
    setPermissions({})
    setAssignments([])
    setError('')
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (Object.keys(permissions).length === 0) {
      setError('Choose at least one module permission.')
      return
    }
    setBusy(true)
    try {
      await inviteCollaborator({
        email,
        fullName,
        roleTitle: roleTitle.trim() || undefined,
        permissions,
        assignments,
      })
      await onComplete()
      reset()
      onClose()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Unable to send the invitation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer title="Invite collaborator" open={open} onClose={close}>
      <form className="stack collaborator-form" onSubmit={submit}>
        <div className="notice-box"><MailPlus size={18}/><span>An invitation email will ask them to set a password and register an authenticator before Kithwork access.</span></div>
        <div className="form-grid two">
          <InputField id="invite-name" label="Full name" value={fullName} maxLength={120} onChange={(event) => setFullName(event.target.value)} required/>
          <InputField id="invite-role" label="Role or title" value={roleTitle} maxLength={120} onChange={(event) => setRoleTitle(event.target.value)}/>
        </div>
        <InputField id="invite-email" label="Email" type="email" autoComplete="email" value={email} maxLength={254} onChange={(event) => setEmail(event.target.value)} required/>
        <section className="editor-section"><h3>Module permissions</h3><p className="muted">Capabilities apply only to assigned records. Collaborators never receive Marketing, Reports, Payments, Settings, Trash, or owner controls.</p><PermissionEditor baseline={{}} value={permissions} onChange={setPermissions}/></section>
        <section className="editor-section"><h3>Record assignments</h3><AssignmentEditor candidates={candidates} selected={assignments} onChange={setAssignments}/></section>
        {error ? <div className="error-box" role="alert">{error}</div> : null}
        <div className="form-actions"><Button disabled={busy}>{busy ? 'Sending invitation…' : 'Send secure invitation'}</Button><Button type="button" variant="ghost" onClick={close} disabled={busy}>Cancel</Button></div>
      </form>
    </Drawer>
  )
}
